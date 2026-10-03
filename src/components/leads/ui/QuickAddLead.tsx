"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { CatalogCar, Lead, LeadSource, LeadStatus } from "@/lib/types";
import { formatPhone } from "@/lib/formatPhone";
import { StatusDropdown } from "./StatusDropdown";
import { SourceDropdown } from "./SourceDropdown";
import { createLead } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { needsNextAction, phoneKey } from "@/lib/leads/match";
import { getStatusLabel } from "@/lib/displayUtils";
import { DatePresets } from "../DateControls";
import { CarChip, CarPicker } from "../CarPicker";

interface QuickAddLeadProps {
  cars: CatalogCar[];
  allLeads: Lead[];
  presetCar?: CatalogCar | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  onSuccess?: () => void;
  onOpenDuplicate?: (lead: Lead) => void;
  onCreated?: (lead: Lead) => void;
  archiveFailed?: boolean;
  catalogError?: boolean;
  catalogLoading?: boolean;
  onRetryCatalog?: () => void;
}

function blankForm(preset?: CatalogCar | null) {
  return {
    name: "",
    phone: "",
    source: "call" as LeadSource,
    car: preset?.name || "",
    status: "new" as LeadStatus,
    notes: "",
    nextActionDate: null as number | null,
    carIds: preset ? [preset.id] : [] as string[],
    primaryCarId: (preset?.id || null) as string | null,
  };
}

export function QuickAddLead({
  cars,
  allLeads,
  presetCar,
  open: openProp,
  onOpenChange,
  hideTrigger,
  onSuccess,
  onOpenDuplicate,
  onCreated,
  archiveFailed,
  catalogError,
  catalogLoading,
  onRetryCatalog,
}: QuickAddLeadProps) {
  const { user } = useAuth();
  const [innerOpen, setInnerOpen] = useState(false);
  const open = openProp ?? innerOpen;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (openProp === undefined) setInnerOpen(v);
  };
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [picker, setPicker] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pendingDup, setPendingDup] = useState<Lead | null>(null);
  const [form, setForm] = useState(() => blankForm(presetCar));

  const missingDate = needsNextAction(form.status) && !form.nextActionDate;
  const dirty = Boolean(form.name.trim() || form.phone.trim() || form.notes.trim() || form.nextActionDate);
  const dup = useMemo(() => {
    const key = phoneKey(form.phone);
    if (key.length < 7) return null;
    const hits = allLeads.filter((l) => phoneKey(l.phone) === key);
    hits.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return hits[0] || null;
  }, [allLeads, form.phone]);

  useEffect(() => {
    if (open && presetCar) {
      setForm((p) => ({
        ...p,
        car: p.car || presetCar.name,
        carIds: p.carIds.includes(presetCar.id) ? p.carIds : [...p.carIds, presetCar.id],
        primaryCarId: p.primaryCarId || presetCar.id,
      }));
    }
  }, [open, presetCar]);

  const finishClose = () => {
    const next = pendingDup;
    setConfirmLeave(false);
    setPendingDup(null);
    setPicker(false);
    setCreateError(false);
    setForm(blankForm());
    setOpen(false);
    if (next) onOpenDuplicate?.(next);
  };

  const requestClose = () => {
    if (dirty) setConfirmLeave(true);
    else finishClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (picker) {
        setPicker(false);
        return;
      }
      if (confirmLeave) {
        setConfirmLeave(false);
        setPendingDup(null);
        return;
      }
      requestClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || missingDate || submitting || !form.name.trim() || !form.phone.trim()) return;
    setSubmitting(true);
    setCreateError(false);
    try {
      const created = await createLead(
        {
          name: form.name.trim(),
          phone: form.phone,
          source: form.source,
          status: form.status,
          car: form.car,
          notes: form.notes,
          nextActionDate: form.nextActionDate,
          carIds: form.carIds,
          primaryCarId: form.primaryCarId,
        },
        user.email || "unknown",
      );
      setForm(blankForm());
      setPicker(false);
      setOpen(false);
      onCreated?.(created);
      onSuccess?.();
    } catch {
      setCreateError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const openDuplicate = () => {
    if (!dup) return;
    if (dirty) {
      setPendingDup(dup);
      setConfirmLeave(true);
      return;
    }
    setForm(blankForm());
    setOpen(false);
    onOpenDuplicate?.(dup);
  };

  const linked = form.carIds.map((id) => cars.find((c) => c.id === id)).filter(Boolean) as CatalogCar[];
  const canCreate = Boolean(form.name.trim() && form.phone.trim() && !missingDate && !submitting);

  if (!open) {
    if (hideTrigger) return null;
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full items-center justify-center rounded-xl bg-leads-paper text-[13px] font-medium text-leads-paper-ink"
      >
        Клиент
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center md:items-center md:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={requestClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] bg-leads-raised text-leads-ink md:rounded-[20px]">
        {picker ? (
          <div className="absolute inset-0 z-10">
            <CarPicker
              cars={cars}
              selectedIds={form.carIds}
              catalogError={catalogError}
              catalogLoading={catalogLoading}
              onRetry={onRetryCatalog}
              onClose={() => setPicker(false)}
              onPick={(car) => {
                setForm((p) => ({
                  ...p,
                  carIds: p.carIds.includes(car.id) ? p.carIds : [...p.carIds, car.id],
                  primaryCarId: p.primaryCarId || car.id,
                  car: p.car || car.name,
                }));
                setPicker(false);
              }}
            />
          </div>
        ) : null}
        <div className="flex items-center justify-between border-b border-leads-line px-5 py-4">
          <h3 className="text-[22px] font-semibold text-leads-ink">Новый клиент</h3>
          <button type="button" onClick={requestClose} className="flex size-9 items-center justify-center rounded-xl text-leads-muted hover:bg-white/[0.06] hover:text-leads-ink" aria-label="Закрыть">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 sm:col-span-1">
              <span className="mb-1.5 block text-[13px] text-leads-muted">Имя</span>
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="h-11 w-full rounded-xl bg-leads-card px-3 text-[15px] text-leads-ink outline-none ring-1 ring-leads-line"
              />
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className="mb-1.5 block text-[13px] text-leads-muted">Телефон</span>
              <input
                required
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                className="h-11 w-full rounded-xl bg-leads-card px-3 text-[15px] text-leads-ink tabular-nums outline-none ring-1 ring-leads-line"
              />
            </label>
          </div>
          {dup ? (
            <button
              type="button"
              onClick={openDuplicate}
              className="w-full rounded-xl bg-leads-card px-3 py-2 text-left ring-1 ring-leads-line"
            >
              <span className="block text-[14px] text-leads-ink">{dup.name || "Без имени"} · {getStatusLabel(dup.status)}</span>
              <span className="mt-0.5 block text-[13px] text-leads-muted">Открыть</span>
            </button>
          ) : null}
          {archiveFailed ? (
            <p className="text-[13px] text-leads-muted">Номер по всей базе проверить не удалось</p>
          ) : null}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[13px] text-leads-muted">Авто</span>
              <button type="button" onClick={() => setPicker(true)} className="text-[13px] font-medium text-leads-ink">
                Со склада
              </button>
            </div>
            <div className="space-y-2">
              {linked.map((car) => (
                <CarChip
                  key={car.id}
                  car={car}
                  primary={form.primaryCarId === car.id}
                  onPrimary={() => setForm((p) => ({ ...p, primaryCarId: car.id, car: p.car || car.name }))}
                  onRemove={() =>
                    setForm((p) => {
                      const carIds = p.carIds.filter((id) => id !== car.id);
                      return { ...p, carIds, primaryCarId: p.primaryCarId === car.id ? carIds[0] || null : p.primaryCarId };
                    })
                  }
                />
              ))}
              <input
                value={form.car}
                onChange={(e) => setForm((p) => ({ ...p, car: e.target.value }))}
                placeholder="Марка, бюджет или комментарий к авто"
                className="h-11 w-full rounded-xl bg-leads-card px-3 text-[15px] text-leads-ink outline-none ring-1 ring-leads-line placeholder:text-leads-subtle"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1.5 block text-[13px] text-leads-muted">Статус</span>
              <StatusDropdown value={form.status} onChange={(status) => setForm((p) => ({ ...p, status }))} />
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] text-leads-muted">Источник</span>
              <SourceDropdown value={form.source} onChange={(source) => setForm((p) => ({ ...p, source }))} />
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[13px] text-leads-muted">Следующий шаг</span>
            <DatePresets value={form.nextActionDate} onChange={(nextActionDate) => setForm((p) => ({ ...p, nextActionDate }))} />
            {missingDate ? <p className="mt-2 text-[13px] text-leads-danger">Нужна дата следующего шага</p> : null}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[13px] text-leads-muted">Заметка</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              placeholder="Что сказал и что обещали"
              className="w-full rounded-xl bg-leads-card p-3 text-[15px] text-leads-ink outline-none ring-1 ring-leads-line placeholder:text-leads-subtle"
            />
          </label>

          {createError ? <p className="text-center text-[13px] text-leads-danger">Создать заявку не удалось</p> : null}
          <button
            type="submit"
            disabled={!canCreate}
            className="h-12 w-full rounded-xl bg-leads-paper text-[14px] font-medium text-leads-paper-ink disabled:opacity-45"
          >
            Создать
          </button>
        </form>

        {confirmLeave ? (
          <div className="absolute inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 md:items-center">
            <div className="w-full max-w-sm rounded-2xl bg-leads-raised p-5 ring-1 ring-leads-line">
              <p className="text-[16px] font-semibold">Закрыть без сохранения?</p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => { setConfirmLeave(false); setPendingDup(null); }} className="rounded-xl px-3 py-2 text-[13px] text-leads-muted">
                  Остаться
                </button>
                <button type="button" onClick={finishClose} className="rounded-xl bg-leads-paper px-3 py-2 text-[13px] font-medium text-leads-paper-ink">
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
