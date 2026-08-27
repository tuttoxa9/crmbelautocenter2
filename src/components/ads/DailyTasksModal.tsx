"use client";

import React from "react";
import { AdCar, AdCampaignType } from "@/lib/types";
import { getPriceTierLabel } from "@/lib/services/adsService";
import { ArrowLeft, ArrowRight, CalendarDays, Loader2, X } from "lucide-react";

interface DailyTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  offset: number;
  cars: AdCar[];
  busyIds?: Set<string>;
  onRotate?: (car: AdCar, campaign: AdCampaignType) => void;
}

export function DailyTasksModal({
  isOpen,
  onClose,
  date,
  offset,
  cars,
  busyIds,
  onRotate,
}: DailyTasksModalProps) {
  if (!isOpen) return null;

  const rk1Cars = cars.filter((c) => c.campaign === "rk1");
  const rk2Cars = cars.filter((c) => c.campaign === "rk2");

  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  const title =
    offset < 0
      ? "Требуют ротации"
      : offset === 0
        ? "План на сегодня"
        : offset === 1
          ? "План на завтра"
          : `План на ${date.getDate()} ${months[date.getMonth()]}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-900/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-zinc-900 leading-tight">{title}</h2>
              <p className="text-[11px] text-zinc-500 font-medium">
                {offset < 0 ? `Просрочено: ${cars.length}` : `К ротации: ${cars.length}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-zinc-100 text-zinc-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-5">
          {cars.length === 0 ? (
            <div className="text-center py-10">
              <p className="font-semibold text-zinc-900">На этот день задач нет</p>
              <p className="text-sm text-zinc-500 mt-1">Ни одна машина не выгорает в эту дату.</p>
            </div>
          ) : (
            <>
              {rk1Cars.length > 0 && (
                <Group
                  title={`Из РК 1 · ${rk1Cars.length}`}
                  cars={rk1Cars}
                  next="rk2"
                  busyIds={busyIds}
                  onRotate={onRotate}
                />
              )}
              {rk2Cars.length > 0 && (
                <Group
                  title={`Из РК 2 · ${rk2Cars.length}`}
                  cars={rk2Cars}
                  next="rk1"
                  busyIds={busyIds}
                  onRotate={onRotate}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({
  title,
  cars,
  next,
  busyIds,
  onRotate,
}: {
  title: string;
  cars: AdCar[];
  next: AdCampaignType;
  busyIds?: Set<string>;
  onRotate?: (car: AdCar, campaign: AdCampaignType) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
      <div className="space-y-2">
        {cars.map((car) => {
          const busy = !!car.id && busyIds?.has(car.id);
          return (
            <div
              key={car.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 bg-white"
            >
              <div className="min-w-0">
                <div className="font-semibold text-sm text-zinc-900 truncate">{car.name}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {getPriceTierLabel(car.priceTier)} · ${Number(car.priceUsd).toLocaleString("ru-RU")}
                </div>
              </div>
              {onRotate && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRotate(car, next)}
                  className="shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-zinc-900 text-white text-[11px] font-semibold disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : next === "rk2" ? (
                    <ArrowRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowLeft className="w-3.5 h-3.5" />
                  )}
                  В {next === "rk2" ? "РК 2" : "РК 1"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
