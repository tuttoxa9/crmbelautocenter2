"use client";

import { useEffect, useMemo, useRef } from "react";
import { type AdCar, type AdsSettings, type TikTokDebt } from "@/lib/types";
import { MONTHS_SHORT, getCalendarDaysLeft, getDateKeyDiffDays, getMinskDateKey } from "@/lib/services/adsService";
import { cn } from "@/lib/utils";

export function RotationTimeline({
  cars,
  settings,
  debts = [],
  days = 14,
  onDayClick,
}: {
  cars: AdCar[];
  settings: AdsSettings;
  debts?: TikTokDebt[];
  days?: number;
  onDayClick?: (offset: number, date: Date, dayCars: AdCar[], dayDebts: TikTokDebt[]) => void;
}) {
  const targetPerDay = Number(settings.targetCarsPerDay || 3);

  const timeline = useMemo(() => {
    const todayKey = getMinskDateKey(Date.now());
    const [year, month, day] = todayKey.split("-").map(Number);
    const today = new Date(year, month - 1, day);
    const oldestDebt = debts.reduce((min, d) => (d.dateKey < min ? d.dateKey : min), todayKey);
    const newestDebt = debts.reduce((max, d) => (d.dateKey > max ? d.dateKey : max), todayKey);
    const pastDays = Math.min(60, Math.max(7, Math.max(0, getDateKeyDiffDays(oldestDebt, todayKey))));
    const futureDays = Math.min(60, Math.max(days, Math.max(0, getDateKeyDiffDays(todayKey, newestDebt)) + 1));

    const active = cars.filter((c) => c.campaign === "rk1" || c.campaign === "rk2");
    const byOffset: Record<number, AdCar[]> = {};
    active.forEach((car) => {
      const left = getCalendarDaysLeft(car.targetRotationDate, car.startedAt, car.maxDays);
      if (left < -pastDays || left > futureDays - 1) return;
      if (!byOffset[left]) byOffset[left] = [];
      byOffset[left].push(car);
    });

    const debtsByOffset: Record<number, TikTokDebt[]> = {};
    debts.forEach((debt) => {
      const left = getDateKeyDiffDays(todayKey, debt.dateKey);
      if (left < -pastDays || left > futureDays - 1) return;
      if (!debtsByOffset[left]) debtsByOffset[left] = [];
      debtsByOffset[left].push(debt);
    });

    const lastWithCars = Math.max(-1, ...Object.keys(byOffset).map(Number));
    return Array.from({ length: pastDays + futureDays }, (_, i) => {
      const offset = i - pastDays;
      const d = new Date(today.getTime());
      d.setDate(d.getDate() + offset);
      const dayCars = byOffset[offset] || [];
      const dayDebts = debtsByOffset[offset] || [];
      const count = dayCars.length;
      const status: "good" | "empty" | "overload" | "off" =
        count > targetPerDay ? "overload" : count > 0 ? "good" : offset > 0 && offset < lastWithCars ? "off" : "empty";
      return { date: d, count, cars: dayCars, debts: dayDebts, status, offset };
    });
  }, [cars, debts, targetPerDay, days]);

  const todayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    todayRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [timeline.length]);

  return (
    <div className="overflow-hidden rounded-2xl bg-ads-bg">
      <div className="ads-scroll overflow-x-auto">
        <div className="inline-flex min-w-full">
          {timeline.map((day) => {
            const fill = Math.min(100, (day.count / Math.max(1, targetPerDay)) * 100);
            const debtN = day.debts.length;
            return (
              <button
                key={day.offset}
                ref={day.offset === 0 ? todayRef : undefined}
                type="button"
                onClick={() => onDayClick?.(day.offset, day.date, day.cars, day.debts)}
                className="group flex min-w-8 flex-1 flex-col sm:min-w-9"
                title={`${day.date.getDate()} ${MONTHS_SHORT[day.date.getMonth()]}: ${day.status === "off" ? "выходной" : day.count}${debtN ? ` · долг ${debtN}` : ""}`}
              >
                <div className="flex h-16 flex-col items-center justify-end gap-1 px-0.5 pb-1.5">
                  <span
                    className={cn(
                      "font-mono text-xs font-medium tabular-nums leading-none",
                      debtN
                        ? "text-ads-warn"
                        : day.status === "overload"
                          ? "text-ads-danger"
                          : day.status === "empty" || day.status === "off" || day.offset < 0
                            ? "text-ads-subtle"
                            : "text-ads-ink",
                    )}
                  >
                    {debtN ? `${day.count}+${debtN}` : day.count}
                  </span>
                  <div className="flex h-10 w-1.5 items-end overflow-hidden rounded-full bg-ads-surface">
                    <div
                      className={cn(
                        "w-full rounded-full transition-[height] duration-300",
                        debtN
                          ? "bg-ads-warn"
                          : day.status === "overload"
                            ? "bg-ads-danger"
                            : day.status === "off"
                              ? "bg-ads-line-strong/25"
                              : day.status === "empty"
                                ? "bg-ads-line-strong/60"
                                : day.offset === 0
                                  ? "bg-ads-ink"
                                  : "bg-ads-ink/45",
                      )}
                      style={{
                        height: `${day.status === "empty" || day.status === "off" ? (debtN ? 28 : 12) : Math.max(16, fill)}%`,
                      }}
                    />
                  </div>
                </div>
                <span
                  className={cn(
                    "pb-2 text-center text-xs font-medium",
                    day.offset === 0 ? "text-ads-ink" : day.offset < 0 ? "text-ads-subtle" : "text-ads-subtle",
                  )}
                >
                  {day.offset === 0 ? "сег" : day.offset === -1 ? "вч" : day.date.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
