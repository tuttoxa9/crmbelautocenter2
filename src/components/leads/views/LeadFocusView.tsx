"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";
import { CheckCircle2, Copy, Phone, Plus, Trash2, X } from "lucide-react";
import type { CatalogCar, Lead, LeadSource, LeadStatus } from "@/lib/types";
import { formatPhone } from "@/lib/formatPhone";
import { getStatusLabel } from "@/lib/displayUtils";
import { StatusBadge, SourceIcon } from "../ui/LeadBadges";
import { StatusDropdown } from "../ui/StatusDropdown";
import { SourceDropdown } from "../ui/SourceDropdown";
import { updateLeadStatus, updateLeadDetails, deleteLead } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { leadCarIds, needsNextAction, phoneKey, resolveLeadCar } from "@/lib/leads/match";
import { DatePresets } from "../DateControls";
import { CarChip, CarPicker } from "../CarPicker";
import { AdsScroller } from "@/components/ads/chrome";
import { cn } from "@/lib/utils";

interface LeadFocusViewProps {
  lead: Lead;
  cars: CatalogCar[];
  allLeads: Lead[];
  onClose: () => void;
  onOpenCar?: (car: CatalogCar) => void;
  onDeleted?: () => void;
}

export function LeadFocusView({ lead, cars, allLeads, onClose, onOpenCar, onDeleted }: LeadFocusViewProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: lead.name || "",
    phone: lead.phone || "",
    car: lead.car || "",
    notes: lead.notes || "",
    status: lead.status,
    nextActionDate: lead.nextActionDate || null as number | null,
    source: lead.source,
    carIds: leadCarIds(lead),
    primaryCarId: lead.primaryCarId || leadCarIds(lead)[0] || null as string | null,
  });
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setForm({
      name: lead.name || "",
      phone: lead.phone || "",
      car: lead.car || "",
      notes: lead.notes || "",
      status: lead.status,
      nextActionDate: lead.nextActionDate || null,
      source: lead.source,
      carIds: leadCarIds(lead),
      primaryCarId: lead.primaryCarId || leadCarIds(lead)[0] || null,
    });
  }, [lead]);

  const linkedCars = form.carIds
    .map((id) => cars.find((c) => c.id === id))
    .filter(Boolean) as CatalogCar[];

  const duplicate = useMemo(() => {
    const key = phoneKey(form.phone);
    if (key.length < 7) return null;
    return allLeads.find((l) => l.id !== lead.id && phoneKey(l.phone) === key) || null;
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

  const missingDate = needsNextAction(form.status) && !form.nextActionDate;

  const save = async () => {
    if (!lead.id || !user || missingDate) return;
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!lead.id) return;
    await deleteLead(lead.id);
    onDeleted?.();
    onClose();
  };

  const tel = form.phone.replace(/\D/g, "");

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      <div className="absolute inset-0 bg-zinc-900/25" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[720px] flex-col bg-white shadow-2xl md:rounded-l-[1.75rem]">
        {picker ? (
          <CarPicker
            cars={cars}
            selectedIds={form.carIds}
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
          <button type="button" onClick={onClose} className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[13px] font-medium text-leads-muted hover:bg-zinc-100 hover:text-leads-ink">
            <X className="size-4" /> Закрыть
          </button>
          <div className="flex items-center gap-2">
            <SourceDropdown value={form.source} onChange={(source) => setForm((p) => ({ ...p, source }))} className="w-auto min-w-[140px]" />
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex size-9 items-center justify-center rounded-full text-leads-subtle hover:bg-red-50 hover:text-red-600">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        <AdsScroller className="min-h-0 flex-1" contentClassName="px-5 py-5 md:px-8 md:py-7">
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Имя"
            className="w-full bg-transparent text-[28px] font-semibold tracking-tight text-leads-ink outline-none placeholder:text-leads-subtle"
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5">
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
                  window.setTimeout(() => setCopied(false), 1400);
                }}
                className="text-leads-subtle hover:text-leads-ink"
              >
                {copied ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              </button>
            </div>
            {tel.length >= 9 ? (
              <a href={`tel:+${tel}`} className="rounded-full bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white">
                Позвонить
              </a>
            ) : null}
          </div>

          {duplicate ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
              Этот номер уже есть: {duplicate.name || "без имени"} · {getStatusLabel(duplicate.status)}
            </p>
          ) : null}

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-medium tracking-wide text-leads-subtle uppercase">Статус</p>
              <StatusDropdown value={form.status} onChange={(status: LeadStatus) => setForm((p) => ({ ...p, status }))} />
            </div>
            <div className="md:col-span-2">
              <p className="mb-2 text-[11px] font-medium tracking-wide text-leads-subtle uppercase">
                Следующий шаг {needsNextAction(form.status) ? "*" : ""}
              </p>
              <DatePresets value={form.nextActionDate} onChange={(nextActionDate) => setForm((p) => ({ ...p, nextActionDate }))} />
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-medium tracking-wide text-leads-subtle uppercase">Автомобили</p>
              <button type="button" onClick={() => setPicker(true)} className="flex items-center gap-1 text-[12px] font-medium text-leads-ink">
                <Plus className="size-3.5" /> Со склада
              </button>
            </div>
            <div className="space-y-2">
              {linkedCars.map((car) => (
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
                placeholder="Или текстом: марка, бюджет…"
                className="h-11 w-full rounded-xl bg-zinc-50 px-3 text-[13px] outline-none ring-1 ring-leads-line focus:bg-white"
              />
            </div>
          </div>

          <div className="mt-8">
            <p className="mb-2 text-[11px] font-medium tracking-wide text-leads-subtle uppercase">Заметка</p>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={5}
              className="w-full resize-y rounded-2xl bg-zinc-50 p-3 text-[13px] leading-relaxed outline-none ring-1 ring-leads-line focus:bg-white"
              placeholder="Что сказал, что обещали"
            />
          </div>

          <div className="mt-8 pb-24">
            <p className="mb-3 text-[11px] font-medium tracking-wide text-leads-subtle uppercase">Активность</p>
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
              <p className="text-xs text-leads-muted">Пока пусто</p>
            )}
          </div>
        </AdsScroller>

        {dirty ? (
          <div className="border-t border-leads-line bg-white/90 p-4 backdrop-blur">
            {missingDate ? <p className="mb-2 text-center text-[11px] text-red-600">Нужна дата следующего шага</p> : null}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || missingDate}
              className="h-12 w-full rounded-full bg-zinc-900 text-[14px] font-semibold text-white disabled:opacity-40"
            >
              {saving ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        ) : null}

        {confirmDelete ? (
          <div className="absolute inset-0 z-[90] flex items-end justify-center bg-zinc-900/30 p-4 md:items-center">
            <div className="w-full max-w-sm rounded-3xl bg-white p-5">
              <p className="text-[16px] font-semibold">Удалить клиента?</p>
              <p className="mt-1 text-[13px] text-leads-muted">Это нельзя отменить.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmDelete(false)} className="h-11 rounded-full ring-1 ring-leads-line text-[13px] font-medium">
                  Отмена
                </button>
                <button type="button" onClick={() => void remove()} className="h-11 rounded-full bg-red-600 text-[13px] font-semibold text-white">
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ) : null}
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
  onOpen,
  onOpenCar,
  showFullDate,
}: {
  lead: Lead;
  cars: CatalogCar[];
  selected?: boolean;
  onOpen: () => void;
  onOpenCar?: (car: CatalogCar) => void;
  showFullDate?: boolean;
}) {
  const car = resolveLeadCar(lead, cars);
  const extra = Math.max(0, leadCarIds(lead).length - (car ? 1 : 0));
  const when = lead.nextActionDate && lead.status !== "new"
    ? formatLeadWhen(lead.nextActionDate, showFullDate)
    : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-3 text-left md:px-4",
        selected ? "bg-zinc-100" : "hover:bg-zinc-50",
      )}
    >
      <SourceIcon source={lead.source} className="size-4 shrink-0 opacity-50" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-leads-ink">{lead.name || "Без имени"}</p>
          <StatusBadge status={lead.status} />
        </div>
        <p className="mt-0.5 font-mono text-[12px] text-leads-muted">{lead.phone || "нет номера"}</p>
        {lead.notes ? <p className="mt-0.5 truncate text-[12px] text-leads-subtle">{lead.notes}</p> : null}
      </div>
      <div className="hidden min-w-0 max-w-[220px] shrink-0 sm:block">
        {car ? (
          <span
            role="link"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCar?.(car);
            }}
            className="flex items-center gap-2 rounded-xl px-1 py-0.5 hover:bg-white"
          >
            <span className="size-8 overflow-hidden rounded-lg bg-zinc-100">
              {car.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={car.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </span>
            <span className="truncate text-[12px] font-medium text-leads-ink">
              {car.name}
              {extra ? ` +${extra}` : ""}
            </span>
          </span>
        ) : lead.car ? (
          <p className="truncate text-[12px] text-leads-muted">{lead.car}</p>
        ) : null}
      </div>
      {when ? (
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-leads-ink">
          {when}
        </span>
      ) : null}
    </button>
  );
}
