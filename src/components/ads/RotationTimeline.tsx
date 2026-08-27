"use client";

import React, { useMemo } from "react";
import { AdCar, AdsSettings } from "@/lib/types";
import { getCalendarDaysLeft, getMinskDateKey } from "@/lib/services/adsService";
import { CalendarDays, Loader2, AlertTriangle } from "lucide-react";

interface RotationTimelineProps {
  cars: AdCar[];
  settings: AdsSettings;
  onDayClick?: (offset: number, date: Date, dayCars: AdCar[]) => void;
  onBalance?: () => void;
  isBalancing?: boolean;
}

export function RotationTimeline({
  cars,
  settings,
  onDayClick,
  onBalance,
  isBalancing,
}: RotationTimelineProps) {
  const targetPerDay = Number(settings.targetCarsPerDay || 3);
  const DAYS_TO_SHOW = 30;

  const { timeline, overdueCars } = useMemo(() => {
    const daysArr = [];
    const todayKey = getMinskDateKey(Date.now());
    const [year, month, day] = todayKey.split("-").map(Number);
    const today = new Date(year, month - 1, day);

    const activeAdCars = cars.filter((c) => c.campaign === "rk1" || c.campaign === "rk2");
    const carsByDayOffset: Record<number, AdCar[]> = {};
    const overdue: AdCar[] = [];

    activeAdCars.forEach((car) => {
      const daysLeft = getCalendarDaysLeft(car.targetRotationDate, car.startedAt, car.maxDays);
      if (daysLeft < 0) overdue.push(car);
      else {
        if (!carsByDayOffset[daysLeft]) carsByDayOffset[daysLeft] = [];
        carsByDayOffset[daysLeft].push(car);
      }
    });

    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      const d = new Date(today.getTime());
      d.setDate(d.getDate() + i);
      const dayCars = carsByDayOffset[i] || [];
      const count = dayCars.length;
      let status: "good" | "empty" | "overload" = "good";
      if (count === 0) status = "empty";
      else if (count > targetPerDay) status = "overload";
      daysArr.push({ date: d, count, cars: dayCars, status, offset: i });
    }
    return { timeline: daysArr, overdueCars: overdue };
  }, [cars, targetPerDay]);

  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex flex-col w-full">
      <div className="px-3 py-2.5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between border-b border-zinc-100">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-semibold text-zinc-800">График ротации</span>
            <span className="text-[11px] text-zinc-400">по {targetPerDay} авто/день</span>
          </div>
          {overdueCars.length > 0 && (
            <button
              onClick={() => onDayClick && onDayClick(-1, new Date(), overdueCars)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
            >
              <AlertTriangle className="w-3 h-3" />
              {overdueCars.length} просрочено
            </button>
          )}
        </div>
        {onBalance && (
          <button
            onClick={onBalance}
            disabled={isBalancing}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-zinc-900 text-white text-[11px] font-semibold hover:bg-zinc-800 disabled:opacity-50"
          >
            {isBalancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {isBalancing ? "Балансировка…" : "Сбалансировать"}
          </button>
        )}
      </div>

      <div className="overflow-x-auto ads-scroll">
        <div className="inline-flex min-w-full">
          {timeline.map((day) => {
            const fill = Math.min(100, (day.count / Math.max(1, targetPerDay)) * 100);
            return (
              <button
                key={day.offset}
                onClick={() => onDayClick && onDayClick(day.offset, day.date, day.cars)}
                className="group flex flex-col min-w-[40px] sm:min-w-[44px] flex-1 border-r border-zinc-100 last:border-r-0"
                title={`${day.date.getDate()} ${months[day.date.getMonth()]}: ${day.count} авто`}
              >
                <div
                  className={`w-full text-center py-1.5 border-b border-zinc-100 ${
                    day.offset === 0 ? "bg-zinc-900 text-white" : "bg-white group-hover:bg-zinc-50"
                  }`}
                >
                  <span className={`block text-[10px] font-medium leading-none ${day.offset === 0 ? "text-white" : "text-zinc-500"}`}>
                    {day.offset === 0 ? "Сег" : `${day.date.getDate()} ${months[day.date.getMonth()]}`}
                  </span>
                </div>
                <div className="px-1.5 py-2 flex flex-col items-center gap-1">
                  <span
                    className={`text-sm font-semibold tabular-nums leading-none ${
                      day.status === "overload"
                        ? "text-rose-700"
                        : day.status === "empty"
                          ? "text-zinc-300"
                          : "text-zinc-800"
                    }`}
                  >
                    {day.count}
                  </span>
                  <div className="h-1 w-full rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        day.status === "overload" ? "bg-rose-500" : day.status === "empty" ? "bg-transparent" : "bg-zinc-800"
                      }`}
                      style={{ width: `${fill}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
