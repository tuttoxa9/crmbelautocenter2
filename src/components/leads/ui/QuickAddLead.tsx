"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type { CatalogCar, LeadSource, LeadStatus } from "@/lib/types";
import { formatPhone } from "@/lib/formatPhone";
import { StatusDropdown } from "./StatusDropdown";
import { SourceDropdown } from "./SourceDropdown";
import { createLead } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { needsNextAction, phoneKey } from "@/lib/leads/match";
import { DatePresets } from "../DateControls";
import { CarChip, CarPicker } from "../CarPicker";
import type { Lead } from "@/lib/types";

interface QuickAddLeadProps {
  cars: CatalogCar[];
  allLeads: Lead[];
  presetCar?: CatalogCar | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  onSuccess?: () => void;
  onOpenDuplicate?: (lead: Lead) => void;
}

export function QuickAddLead({ cars, allLeads, presetCar, open: openProp, onOpenChange, hideTrigger, onSuccess, onOpenDuplicate }: QuickAddLeadProps) {
  const { user } = useAuth();
  const [innerOpen, setInnerOpen] = useState(false);
  const open = openProp ?? innerOpen;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (openProp === undefined) setInnerOpen(v);
  };
  const [submitting, setSubmitting] = useState(false);
  const [picker, setPicker] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    source: "call" as LeadSource,
    car: presetCar?.name || "",
    status: "new" as LeadStatus,
    notes: "",
    nextActionDate: null as number | null,
    carIds: presetCar ? [presetCar.id] : [] as string[],
    primaryCarId: presetCar?.id || null as string | null,
  });

  const missingDate = needsNextAction(form.status) && !form.nextActionDate;
  const dup = form.phone
    ? allLeads.find((l) => phoneKey(l.phone) === phoneKey(form.phone) && phoneKey(form.phone).length >= 7)
    : null;

  const reset = () => {
    setForm({
      name: "",
      phone: "",
      source: "call",
      car: presetCar?.name || "",
      status: "new",
      notes: "",
      nextActionDate: null,
      carIds: presetCar ? [presetCar.id] : [],
      primaryCarId: presetCar?.id || null,
    });
  };

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || missingDate) return;
    setSubmitting(true);
    try {
      await createLead(
        {
          name: form.name,
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
      reset();
      setOpen(false);
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  const linked = form.carIds.map((id) => cars.find((c) => c.id === id)).filter(Boolean) as CatalogCar[];

  if (!open) {
    if (hideTrigger) return null;
    return (
      <button
        type="button"
        onClick={() => {
          if (presetCar) {
            setForm((p) => ({
              ...p,
              car: presetCar.name,
              carIds: [presetCar.id],
              primaryCarId: presetCar.id,
            }));
          }
          setOpen(true);
        }}
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-semibold text-black"
      >
        <Plus className="size-4" /> Клиент
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center p-0 md:items-center md:p-4">
      <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[#141416] text-zinc-100 ring-1 ring-white/10 md:rounded-3xl">
        {picker ? (
          <div className="absolute inset-0 z-10">
            <CarPicker
              cars={cars}
              selectedIds={form.carIds}
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
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-[17px] font-semibold text-zinc-100">Новый клиент</h3>
          <button type="button" onClick={() => setOpen(false)} className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 sm:col-span-1">
              <span className="mb-1 block text-[11px] font-medium text-zinc-500 uppercase">Имя</span>
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="h-11 w-full rounded-xl bg-white/[0.04] px-3 text-[14px] text-zinc-100 outline-none ring-1 ring-white/10 placeholder:text-zinc-600 focus:bg-white/[0.06] focus:ring-zinc-400"
              />
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className="mb-1 block text-[11px] font-medium text-zinc-500 uppercase">Телефон</span>
              <input
                required
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                className="h-11 w-full rounded-xl bg-white/[0.04] px-3 font-mono text-[14px] text-zinc-100 outline-none ring-1 ring-white/10 placeholder:text-zinc-600 focus:bg-white/[0.06] focus:ring-zinc-400"
              />
            </label>
          </div>
          {dup ? (
            <button
              type="button"
              onClick={() => onOpenDuplicate?.(dup)}
              className="w-full rounded-xl bg-amber-500/15 px-3 py-2 text-left text-[12px] text-amber-200 ring-1 ring-amber-400/40 hover:bg-amber-500/20"
            >
              Номер уже есть: {dup.name || "без имени"} · открыть
            </button>
          ) : null}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-500 uppercase">Авто</span>
              <button type="button" onClick={() => setPicker(true)} className="text-[12px] font-medium text-zinc-200 hover:text-white">
                Со склада
              </button>
            </div>
            <div className="space-y-2">
              {linked.map((car) => (
                <CarChip
                  key={car.id}
                  car={car}
                  primary={form.primaryCarId === car.id}
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
                placeholder="Или текстом"
                className="h-11 w-full rounded-xl bg-white/[0.04] px-3 text-[14px] text-zinc-100 outline-none ring-1 ring-white/10 placeholder:text-zinc-600 focus:bg-white/[0.06] focus:ring-zinc-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-[11px] font-medium text-zinc-500 uppercase">Статус</span>
              <StatusDropdown value={form.status} onChange={(status) => setForm((p) => ({ ...p, status }))} />
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-medium text-zinc-500 uppercase">Источник</span>
              <SourceDropdown value={form.source} onChange={(source) => setForm((p) => ({ ...p, source }))} />
            </div>
          </div>

          <div>
            <span className="mb-1 block text-[11px] font-medium text-zinc-500 uppercase">
              Следующий шаг {needsNextAction(form.status) ? "*" : ""}
            </span>
            <DatePresets value={form.nextActionDate} onChange={(nextActionDate) => setForm((p) => ({ ...p, nextActionDate }))} />
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-zinc-500 uppercase">Заметка</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              className="w-full rounded-2xl bg-white/[0.04] p-3 text-[13px] text-zinc-100 outline-none ring-1 ring-white/10 placeholder:text-zinc-600 focus:bg-white/[0.06]"
            />
          </label>

          {missingDate ? <p className="text-center text-[11px] text-red-400">Нужна дата следующего шага</p> : null}
          <button
            type="submit"
            disabled={submitting || missingDate}
            className="h-12 w-full rounded-full bg-white text-[14px] font-semibold text-black disabled:opacity-40"
          >
            {submitting ? "Создаём…" : "Добавить"}
          </button>
        </form>
      </div>
    </div>
  );
}
