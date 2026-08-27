"use client";

import React from "react";
import { AdCar, AdCampaignType, AdsSettings } from "@/lib/types";
import { AlertTriangle } from "lucide-react";
import { AdsCarCard } from "./AdsCarCard";

interface AdsTodayQueueProps {
  dueToday: AdCar[];
  overdue: AdCar[];
  settings: AdsSettings;
  busyIds: Set<string>;
  onSwitch: (car: AdCar, campaign: AdCampaignType) => void;
  onSaveDays: (car: AdCar, days: number) => void;
  onReset: (car: AdCar) => void;
  onDelete: (car: AdCar) => void;
}

export function AdsTodayQueue({
  dueToday,
  overdue,
  settings,
  busyIds,
  onSwitch,
  onSaveDays,
  onReset,
  onDelete,
}: AdsTodayQueueProps) {
  if (dueToday.length === 0 && overdue.length === 0) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
      <header className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-zinc-700" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Смена сегодня</h2>
            <p className="text-[11px] text-zinc-500">
              Авто, которые нужно перенести между РК. Сначала просроченные.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold tabular-nums text-zinc-700">
          {overdue.length + dueToday.length}
        </span>
      </header>

      <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {[...overdue, ...dueToday].map((car) => (
              <AdsCarCard
                key={car.id}
                car={car}
                settings={settings}
                busy={!!car.id && busyIds.has(car.id)}
                onSwitch={onSwitch}
                onSaveDays={onSaveDays}
                onReset={onReset}
                onDelete={onDelete}
              />
        ))}
      </div>
    </section>
  );
}
