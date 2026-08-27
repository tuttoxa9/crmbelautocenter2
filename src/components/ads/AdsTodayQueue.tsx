"use client";

import React from "react";
import { AdCar, AdCampaignType, AdsSettings } from "@/lib/types";
import { getAdBurn } from "@/lib/services/adsProgress";
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
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

  const rotateTarget = (car: AdCar): AdCampaignType =>
    car.campaign === "rk1" ? "rk2" : "rk1";

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
        {[...overdue, ...dueToday].map((car) => {
          const burn = getAdBurn(car, settings);
          const next = rotateTarget(car);
          return (
            <div key={car.id} className="relative">
              <AdsCarCard
                car={car}
                settings={settings}
                busy={!!car.id && busyIds.has(car.id)}
                onSwitch={onSwitch}
                onSaveDays={onSaveDays}
                onReset={onReset}
                onDelete={onDelete}
              />
              <div className="absolute top-3 right-3">
                <button
                  type="button"
                  onClick={() => onSwitch(car, next)}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-zinc-900 text-white text-[10px] font-semibold shadow-sm"
                >
                  {next === "rk2" ? (
                    <ArrowRight className="w-3 h-3" />
                  ) : (
                    <ArrowLeft className="w-3 h-3" />
                  )}
                  {burn.tone === "overdue" ? "Ротировать" : "Сегодня"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
