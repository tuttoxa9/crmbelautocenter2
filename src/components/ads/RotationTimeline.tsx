"use client";

import { useMemo } from "react";
import { type AdCar, type AdsSettings } from "@/lib/types";
import { MONTHS_SHORT, getCalendarDaysLeft, getMinskDateKey } from "@/lib/services/adsService";
import { cn } from "@/lib/utils";

export function RotationTimeline({
  cars,
  settings,
  days = 14,
  onDayClick,
}: {
  cars: AdCar[];
  settings: AdsSettings;
  days?: number;
  onDayClick?: (offset: number, date: Date, dayCars: AdCar[]) => void;
}) {
  const targetPerDay = Number(settings.targetCarsPerDay || 3);

  const timeline = useMemo(() => {
    const todayKey = getMinskDateKey(Date.now());
    const [year, month, day] = todayKey.split("-").map(Number);
    const today = new Date(year, month - 1, day);
    const active = cars.filter((c) => c.campaign === "rk1" || c.campaign === "rk2");
    const byOffset: Record<number, AdCar[]> = {};
    active.forEach((car) => {
      const left = getCalendarDaysLeft(car.targetRotationDate, car.startedAt, car.maxDays);
      if (left < 0) return;
      if (!byOffset[left]) byOffset[left] = [];
      byOffset[left].push(car);
    });
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today.getTime());
      d.setDate(d.getDate() + i);
      const dayCars = byOffset[i] || [];
      const count = dayCars.length;
      const status: "good" | "empty" | "overload" =
        count === 0 ? "empty" : count > targetPerDay ? "overload" : "good";
      return { date: d, count, cars: dayCars, status, offset: i };
    });
  }, [cars, targetPerDay, days]);

  return (
    <div className="overflow-hidden rounded-2xl bg-ads-bg">
      <div className="ads-scroll overflow-x-auto">
        <div className="inline-flex min-w-full">
          {timeline.map((day) => {
            const fill = Math.min(100, (day.count / Math.max(1, targetPerDay)) * 100);
            return (
              <button
                key={day.offset}
                type="button"
                onClick={() => onDayClick?.(day.offset, day.date, day.cars)}
                className="group flex min-w-8 flex-1 flex-col sm:min-w-9"
                title={`${day.date.getDate()} ${MONTHS_SHORT[day.date.getMonth()]}: ${day.count}`}
              >
                <div className="flex h-16 flex-col items-center justify-end gap-1 px-0.5 pb-1.5">
                  <span
                    className={cn(
                      "font-mono text-xs font-medium tabular-nums leading-none",
                      day.status === "overload"
                        ? "text-ads-danger"
                        : day.status === "empty"
                          ? "text-ads-subtle"
                          : "text-ads-ink",
                    )}
                  >
                    {day.count}
                  </span>
                  <div className="flex h-10 w-1.5 items-end overflow-hidden rounded-full bg-ads-surface">
                    <div
                      className={cn(
                        "w-full rounded-full transition-[height] duration-300",
                        day.status === "overload"
                          ? "bg-ads-danger"
                          : day.status === "empty"
                            ? "bg-ads-line-strong/60"
                            : day.offset === 0
                              ? "bg-ads-ink"
                              : "bg-ads-ink/45",
                      )}
                      style={{
                        height: `${day.status === "empty" ? 12 : Math.max(16, fill)}%`,
                      }}
                    />
                  </div>
                </div>
                <span
                  className={cn(
                    "pb-2 text-center text-xs font-medium",
                    day.offset === 0 ? "text-ads-ink" : "text-ads-subtle",
                  )}
                >
                  {day.offset === 0 ? "сег" : day.date.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
