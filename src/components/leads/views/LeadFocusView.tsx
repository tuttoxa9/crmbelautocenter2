"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";
import { CheckCircle2, Copy, Phone, Trash2, X } from "lucide-react";
import type { CatalogCar, Lead, LeadSource, LeadStatus } from "@/lib/types";
import { formatPhone } from "@/lib/formatPhone";
import { getStatusLabel } from "@/lib/displayUtils";
import { StatusBadge, SourceIcon, getStatusDotColor } from "../ui/LeadBadges";
import { StatusDropdown } from "../ui/StatusDropdown";
import { SourceDropdown } from "../ui/SourceDropdown";
import { updateLeadStatus, updateLeadDetails, deleteLead } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { isActiveStatus, leadCarIds, metaOriginLine, needsNextAction, phoneKey, resolveLeadCar } from "@/lib/leads/match";
import { leadChannelLabel } from "@/lib/displayUtils";
import { CarPhoto } from "../chrome";
import { DatePresets } from "../DateControls";
import { CarChip, CarPicker } from "../CarPicker";
import { BlockIpModal, isValidIp } from "../BlockIpModal";
import { AdsScroller } from "@/components/ads/chrome";
import { cn } from "@/lib/utils";

interface LeadFocusViewProps {
  lead: Lead;
  cars: CatalogCar[];
  allLeads: Lead[];
  onClose: () => void;
  onOpenCar?: (car: CatalogCar) => void;
  onDeleted?: () => void;
  onOpenDuplicate?: (lead: Lead) => void;
  onUpdated?: (lead: Lead) => void;
  archiveFailed?: boolean;
  catalogError?: boolean;
  catalogLoading?: boolean;
  onRetryCatalog?: () => void;
}

function formFrom(lead: Lead) {
  return {
    name: lead.name || "",
    phone: lead.phone || "",
    car: lead.car || "",
    notes: lead.notes || "",
    status: lead.status,
    nextActionDate: lead.nextActionDate || null as number | null,
    source: lead.source,
    carIds: leadCarIds(lead),
    primaryCarId: lead.primaryCarId || leadCarIds(lead)[0] || null as string | null,
  };
}

function leadKey(lead: Lead) {
  return JSON.stringify({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    car: lead.car,
    notes: lead.notes,
    status: lead.status,
    next: lead.nextActionDate || null,
    source: lead.source,
    ids: leadCarIds(lead),
    primary: lead.primaryCarId || null,
    updatedAt: lead.updatedAt,
    history: lead.history?.length || 0,
  });
}

export function LeadFocusView({ lead, cars, allLeads, onClose, onOpenCar, onDeleted, onOpenDuplicate, onUpdated, archiveFailed, catalogError, catalogLoading, onRetryCatalog }: LeadFocusViewProps) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => formFrom(lead));
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [picker, setPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [blockIpOpen, setBlockIpOpen] = useState(false);
  const [remote, setRemote] = useState(false);
  const dirtyRef = useRef(false);
  const seenKey = useRef<string | null>(null);
  const leadIp = useMemo(() => {
    if (isValidIp(lead.ip)) return (lead.ip as string).trim();
    const payload = lead.payload as Record<string, unknown> | undefined;
    if (payload) {
      if (isValidIp(payload.ip)) return String(payload.ip).trim();
      if (isValidIp(payload.clientIp)) return String(payload.clientIp).trim();
      if (isValidIp(payload.user_ip)) return String(payload.user_ip).trim();
    }
    if (typeof lead.notes === "string") {
      const match = lead.notes.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/);
      if (match && isValidIp(match[0])) return match[0];
    }
    return "";
  }, [lead.ip, lead.payload, lead.notes]);

  const key = leadKey(lead);
  useEffect(() => {
    if (seenKey.current === key) return;
    const first = seenKey.current === null;
    seenKey.current = key;
    if (!first && dirtyRef.current) {
      setRemote(true);
      return;
    }
    setRemote(false);
    setForm(formFrom(lead));
  }, [key, lead]);

  const linkedCars = form.carIds
    .map((id) => cars.find((c) => c.id === id))
    .filter(Boolean) as CatalogCar[];

  const duplicate = useMemo(() => {
    const key = phoneKey(form.phone);
    if (key.length < 7) return null;
    const hits = allLeads.filter((l) => l.id !== lead.id && phoneKey(l.phone) === key);
    hits.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return hits[0] || null;
  }, [allLeads, form.phone, lead.id]);

  const dirty =
    form.name !== (lead.name || "") ||
    form.phone !== (lead.phone || "") ||
    form.car !== (lead.car || "") ||
    form.notes !== (lead.notes || "") ||
    form.status !== lead.status ||
    form.nextActionDate !== (lead.nextActionDate || null) ||
    form.source !== lead.source ||
    JSON.stringify(form.carIds) !== JSON.stringify(leadCarIds(lead)) ||
    form.primaryCarId !== (lead.primaryCarId || leadCarIds(lead)[0] || null);
  dirtyRef.current = dirty;

  const missingDate = needsNextAction(form.status) && !form.nextActionDate;
  const primaryCar = linkedCars.find((car) => car.id === form.primaryCarId) || linkedCars[0] || null;
  const origin = metaOriginLine({ ...lead, carIds: form.carIds, primaryCarId: form.primaryCarId });

  const requestClose = () => {
    if (dirty) setConfirmLeave(true);
    else onClose();
  };

  const save = async () => {
    if (!lead.id || !user || missingDate) return;
    setSaving(true);
    setSaveError(false);
    try {
      if (form.status !== lead.status) {
        await updateLeadStatus(
          lead.id,
          form.status,
          user.email || "unknown",
          `Статус: ${getStatusLabel(lead.status)} → ${getStatusLabel(form.status)}`,
          form.nextActionDate,
        );
      }
      await updateLeadDetails(lead.id, {
        name: form.name,
        phone: form.phone,
        car: form.car,
        notes: form.notes,
        source: form.source as LeadSource,
        carIds: form.carIds,
        primaryCarId: form.primaryCarId,
        ...(form.status === lead.status ? { nextActionDate: form.nextActionDate } : {}),
      });
      const changed = form.status !== lead.status;
      onUpdated?.({
        ...lead,
        name: form.name,
        phone: form.phone,
        car: form.car,
        notes: form.notes,
        status: form.status,
        nextActionDate: form.nextActionDate,
        source: form.source,
        carIds: form.carIds,
        primaryCarId: form.primaryCarId,
        updatedAt: Date.now(),
        history: changed
          ? [
              ...(lead.history || []),
              {
                status: form.status,
                changedAt: Date.now(),
                changedBy: user.email || "unknown",
                comment: `Статус: ${getStatusLabel(lead.status)} → ${getStatusLabel(form.status)}`,
              },
            ]
          : lead.history,
      });
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!lead.id) return;
    setDeleteError(false);
    try {
      await deleteLead(lead.id);
      onDeleted?.();
      onClose();
    } catch {
      setDeleteError(true);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (picker) {
        setPicker(false);
        return;
      }
      if (confirmDelete) {
        setConfirmDelete(false);
        return;
      }
      if (confirmLeave) {
        setConfirmLeave(false);
        return;
      }
      if (blockIpOpen) {
        setBlockIpOpen(false);
        return;
      }
      requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const tel = form.phone.replace(/\D/g, "");

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={requestClose} />
      <div className="relative flex h-full w-full max-w-[760px] flex-col bg-leads-raised shadow-2xl md:rounded-l-[20px]">
        {picker ? (
          <CarPicker
            cars={cars}
            selectedIds={form.carIds}
            catalogError={catalogError}
            catalogLoading={catalogLoading}
            onRetry={onRetryCatalog}
            onClose={() => setPicker(false)}
            onPick={(car) => {
              const ids = form.carIds.includes(car.id) ? form.carIds : [...form.carIds, car.id];
              setForm((p) => ({
                ...p,
                carIds: ids,
                primaryCarId: p.primaryCarId || car.id,
                car: p.car || car.name,
              }));
              setPicker(false);
            }}
          />
        ) : null}

        <div className="flex items-center justify-between border-b border-leads-line px-3 py-2.5">
          <button type="button" onClick={requestClose} className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-[13px] font-medium text-leads-muted hover:bg-white/[0.06] hover:text-leads-ink">
            <X className="size-4" /> Закрыть
          </button>
          <div className="flex items-center gap-2">
            <SourceDropdown value={form.source} onChange={(source) => setForm((p) => ({ ...p, source }))} className="w-auto min-w-[140px]" />
            <button type="button" onClick={() => { setDeleteError(false); setConfirmDelete(true); }} className="flex size-9 items-center justify-center rounded-xl text-leads-subtle hover:bg-white/[0.06] hover:text-leads-ink" aria-label="Удалить">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        <AdsScroller className="min-h-0 flex-1" contentClassName="px-5 py-5 md:px-8 md:py-7">
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Имя"
            className="w-full bg-transparent text-[32px] font-semibold tracking-tight text-leads-ink outline-none placeholder:text-leads-subtle"
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-white/[0.08] px-3 py-1.5">
              <Phone className="size-3.5 text-leads-muted" />
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                className="w-[16ch] bg-transparent font-mono text-[14px] font-medium outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!form.phone) return;
                  void navigator.clipboard.writeText(form.phone);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                }}
                className="text-leads-subtle hover:text-leads-ink"
              >
                {copied ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              </button>
            </div>
            {tel.length >= 9 ? (
              <a href={`tel:+${tel}`} className="rounded-xl bg-leads-paper px-3 py-1.5 text-[13px] font-medium text-leads-paper-ink">
                Позвонить
              </a>
            ) : null}

            {leadIp ? (
              <p className="text-[14px] text-leads-muted tabular-nums">
                {leadIp}
                <button type="button" onClick={() => setBlockIpOpen(true)} className="ml-3 font-medium text-leads-ink">
                  Заблокировать
                </button>
              </p>
            ) : (
              <button type="button" onClick={() => setBlockIpOpen(true)} className="text-[13px] font-medium text-leads-muted hover:text-leads-ink">
                Указать IP
              </button>
            )}
          </div>

          {duplicate ? (
            <button
              type="button"
              onClick={() => onOpenDuplicate?.(duplicate)}
              className="mt-3 w-full rounded-xl bg-leads-card px-3 py-2 text-left ring-1 ring-leads-line"
            >
              {duplicate.name || "Без имени"} · {getStatusLabel(duplicate.status)}
              <span className="mt-0.5 block text-[13px]">Открыть</span>
            </button>
          ) : null}
          {archiveFailed ? (
            <p className="mt-3 text-[13px] text-leads-muted">Номер по всей базе проверить не удалось</p>
          ) : null}

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-medium text-leads-muted">Автомобиль</p>
              <button type="button" onClick={() => setPicker(true)} className="text-[13px] font-medium text-leads-ink">
                Со склада
              </button>
            </div>
            {primaryCar ? (
              <div className="mb-3 overflow-hidden rounded-2xl bg-leads-card ring-1 ring-leads-line">
                <button type="button" onClick={() => onOpenCar?.(primaryCar)} className="block w-full text-left">
                  <span className="block aspect-video">
                    <CarPhoto name={primaryCar.make || primaryCar.name} photoUrl={primaryCar.photoUrl} className="h-full w-full" />
                  </span>
                  <span className="block px-4 pt-3">
                    <span className="block text-[16px] font-semibold text-leads-ink">{primaryCar.name}</span>
                    <span className="mt-1 block text-[14px] text-leads-muted tabular-nums">
                      {[primaryCar.year, primaryCar.priceUsd ? `${primaryCar.priceUsd.toLocaleString("ru-RU")} $` : "", primaryCar.mileage ? `${primaryCar.mileage.toLocaleString("ru-RU")} км` : "", primaryCar.isSold ? "Продана" : "В наличии"].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
                <span className="flex items-center justify-between px-4 py-3">
                  <a
                    href={`https://belautocenter.by/catalog/${primaryCar.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[13px] text-leads-muted hover:text-leads-ink"
                  >
                    На сайте
                  </a>
                  <span className="text-[13px] text-leads-subtle">Основная</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => {
                        const carIds = p.carIds.filter((id) => id !== primaryCar.id);
                        const nextPrimary = p.primaryCarId === primaryCar.id ? carIds[0] || null : p.primaryCarId;
                        return { ...p, carIds, primaryCarId: nextPrimary };
                      })
                    }
                    className="text-[13px] font-medium text-leads-muted hover:text-leads-danger"
                  >
                    Убрать
                  </button>
                </span>
              </div>
            ) : null}
            {primaryCar?.isSold && isActiveStatus(form.status) ? (
              <p className="mb-3 text-[14px] text-leads-ink">Машина уже продана</p>
            ) : null}
            {origin ? <p className="mb-3 text-[13px] text-leads-subtle">{origin}</p> : null}
            {!form.carIds.length ? <p className="mb-2 text-[13px] text-leads-subtle">К складу не привязано</p> : null}
            <div className="space-y-2">
              {linkedCars.filter((car) => car.id !== primaryCar?.id).map((car) => (
                <div key={car.id} className="cursor-pointer" onClick={() => onOpenCar?.(car)}>
                  <CarChip
                    car={car}
                    primary={form.primaryCarId === car.id}
                    onPrimary={() => setForm((p) => ({ ...p, primaryCarId: car.id, car: p.car || car.name }))}
                    onRemove={() =>
                      setForm((p) => {
                        const carIds = p.carIds.filter((id) => id !== car.id);
                        const primaryCarId = p.primaryCarId === car.id ? carIds[0] || null : p.primaryCarId;
                        return { ...p, carIds, primaryCarId };
                      })
                    }
                  />
                </div>
              ))}
              <input
                value={form.car}
                onChange={(e) => setForm((p) => ({ ...p, car: e.target.value }))}
                placeholder="Марка, бюджет или комментарий к авто"
                className="h-11 w-full rounded-xl bg-leads-card px-3 text-[15px] text-leads-ink outline-none ring-1 ring-leads-line"
              />
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[13px] font-medium text-leads-muted">Статус</p>
              <StatusDropdown value={form.status} onChange={(status: LeadStatus) => setForm((p) => ({ ...p, status }))} />
            </div>
            <div className="md:col-span-2">
              <p className="mb-2 text-[13px] font-medium text-leads-muted">
                Следующий шаг
              </p>
              <DatePresets value={form.nextActionDate} onChange={(nextActionDate) => setForm((p) => ({ ...p, nextActionDate }))} />
            </div>
          </div>

          <div className="mt-8">
            <p className="mb-2 text-[13px] font-medium text-leads-muted">Заметка</p>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={5}
              className="w-full resize-y rounded-xl bg-leads-card p-3 text-[15px] leading-relaxed text-leads-ink outline-none ring-1 ring-leads-line"
              placeholder="Что сказал и что обещали"
            />
          </div>

          <div className="mt-8 pb-8">
            <p className="mb-3 text-[13px] font-medium text-leads-muted">Активность</p>
            {lead.history?.length ? (
              <div className="space-y-4 border-l border-leads-line pl-4">
                {[...lead.history].reverse().map((event, i) => (
                  <div key={`${event.changedAt}-${i}`}>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={event.status} />
                      <span className="text-[11px] text-leads-subtle">
                        {format(new Date(event.changedAt), "d MMM yyyy, HH:mm", { locale: ru })}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-leads-muted">{event.changedBy}</p>
                    {event.comment ? <p className="mt-1 text-[12px] text-leads-ink">{event.comment}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[15px] text-leads-muted">Изменений пока нет</p>
            )}
          </div>
        </AdsScroller>

        {remote ? (
          <div className="flex items-center justify-between gap-3 border-t border-leads-line px-4 py-3 text-[13px]">
            <p>Эту заявку изменили в другом месте</p>
            <button
              type="button"
              className="shrink-0 font-medium"
              onClick={() => {
                setForm(formFrom(lead));
                setRemote(false);
              }}
            >
              Показать новое
            </button>
          </div>
        ) : null}

        {dirty ? (
          <div className="border-t border-leads-line bg-leads-raised p-4">
            {missingDate ? <p className="mb-2 text-center text-[13px] text-leads-danger">Нужна дата следующего шага</p> : null}
            {saveError ? <p className="mb-2 text-center text-[13px] text-leads-danger">Не сохранилось</p> : null}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || missingDate}
              className="h-12 w-full rounded-xl bg-leads-paper text-[14px] font-medium text-leads-paper-ink disabled:opacity-45"
            >
              {saving ? "Сохраняем" : "Сохранить"}
            </button>
          </div>
        ) : null}

        {confirmDelete ? (
          <div className="absolute inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 md:items-center">
            <div className="w-full max-w-sm rounded-2xl bg-leads-raised p-5 ring-1 ring-leads-line">
              <p className="text-[16px] font-semibold">Удалить клиента?</p>
              <p className="mt-1 text-[14px] text-leads-muted">Это нельзя отменить.</p>
              {deleteError ? <p className="mt-2 text-[13px] text-leads-danger">Удалить не удалось</p> : null}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmDelete(false)} className="h-11 rounded-xl text-[13px] font-medium ring-1 ring-leads-line">
                  Отмена
                </button>
                <button type="button" onClick={() => void remove()} className="h-11 rounded-xl bg-leads-danger text-[13px] font-medium text-white">
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {confirmLeave ? (
          <div className="absolute inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 md:items-center">
            <div className="w-full max-w-sm rounded-2xl bg-leads-raised p-5 ring-1 ring-leads-line">
              <p className="text-[16px] font-semibold">Закрыть без сохранения?</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmLeave(false)} className="h-11 rounded-xl text-[13px] font-medium ring-1 ring-leads-line">
                  Остаться
                </button>
                <button type="button" onClick={onClose} className="h-11 rounded-xl bg-leads-paper text-[13px] font-medium text-leads-paper-ink">
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <BlockIpModal
          isOpen={blockIpOpen}
          ip={leadIp}
          leadId={lead.id}
          leadName={lead.name}
          onClose={() => setBlockIpOpen(false)}
          onSuccess={() => {}}
        />
      </div>
    </div>
  );
}

function formatLeadWhen(ts: number, full?: boolean) {
  const d = new Date(ts);
  const time = format(d, "HH:mm");
  if (!full) return time;
  if (isYesterday(d)) return `Вчера, ${time}`;
  if (isToday(d)) return `Сегодня, ${time}`;
  return `${format(d, "d MMM", { locale: ru })}, ${time}`;
}

export function LeadRow({
  lead,
  cars,
  selected,
  highlight,
  onOpen,
  onOpenCar,
  showFullDate,
}: {
  lead: Lead;
  cars: CatalogCar[];
  selected?: boolean;
  highlight?: boolean;
  onOpen: () => void;
  onOpenCar?: (car: CatalogCar) => void;
  showFullDate?: boolean;
}) {
  const car = resolveLeadCar(lead, cars);
  const extra = Math.max(0, leadCarIds(lead).length - (car ? 1 : 0));
  const whenTs = lead.status === "new" || !lead.nextActionDate ? lead.createdAt : lead.nextActionDate;
  const when = whenTs ? formatLeadWhen(whenTs, Boolean(showFullDate)) : null;
  return (
    <button
      type="button"
      data-lead-id={lead.id}
      onClick={onOpen}
      className={cn(
        "flex min-h-[76px] w-full items-center gap-3 px-4 py-3 text-left md:px-5",
        highlight ? "bg-[#3a3428]" : selected ? "bg-[#262a32]" : "hover:bg-white/[0.03]",
      )}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ background: getStatusDotColor(lead.status) }} aria-hidden />
      <span title={leadChannelLabel(lead)} aria-label={leadChannelLabel(lead)}>
        <SourceIcon source={lead.source} className="size-4 shrink-0" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold text-leads-ink">{lead.name || "Без имени"}</p>
        <p className="mt-0.5 text-[14px] text-leads-muted tabular-nums">{lead.phone || "нет номера"}</p>
        {lead.notes ? <p className="mt-0.5 truncate text-[13px] text-leads-subtle">{lead.notes}</p> : null}
        <div className="mt-1 sm:hidden">
          {car ? (
            <span
              role="link"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCar?.(car);
              }}
              className="flex items-center gap-2"
            >
              <span className="size-8 overflow-hidden rounded-lg">
                <CarPhoto name={car.make || car.name} photoUrl={car.photoUrl} className="size-8" />
              </span>
              <span className="truncate text-[13px] text-leads-ink">{car.name}{extra ? ` +${extra}` : ""}</span>
            </span>
          ) : lead.car ? (
            <span className="truncate text-[13px] text-leads-muted">{lead.car} · не со склада</span>
          ) : null}
        </div>
      </div>
      <div className="hidden min-w-0 max-w-[240px] shrink-0 sm:block">
        {car ? (
          <span
            role="link"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCar?.(car);
            }}
            className="flex items-center gap-2 rounded-xl px-1 py-0.5 hover:bg-white/[0.06]"
          >
            <span className="size-10 overflow-hidden rounded-lg">
              <CarPhoto name={car.make || car.name} photoUrl={car.photoUrl} className="size-10" />
            </span>
            <span className="truncate text-[13px] font-medium text-leads-ink">
              {car.name}
              {extra ? ` +${extra}` : ""}
            </span>
          </span>
        ) : lead.car ? (
          <p className="truncate text-[13px] text-leads-muted">{lead.car} <span className="text-leads-subtle">не со склада</span></p>
        ) : null}
      </div>
      {when ? <span className="shrink-0 text-[13px] font-medium text-leads-muted tabular-nums">{when}</span> : null}
    </button>
  );
}
