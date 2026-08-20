import React, { useMemo } from "react";
import { AdCar, AdsSettings } from "@/lib/types";
import { calculateDaysInAd } from "@/lib/services/adsService";
import { CalendarDays } from "lucide-react";

interface RotationTimelineProps {
  cars: AdCar[];
  settings: AdsSettings;
}

export function RotationTimeline({ cars, settings }: RotationTimelineProps) {
  const targetPerDay = settings.targetCarsPerDay || 3;
  const DAYS_TO_SHOW = 30; // Expanded from 14 to 30

  // Aggregate expiration dates for next 30 days
  const timeline = useMemo(() => {
    const daysArr = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeAdCars = cars.filter(c => c.campaign === "rk1" || c.campaign === "rk2");

    // Precalculate counts by days-from-today
    const countsByDayOffset: Record<number, number> = {};
    activeAdCars.forEach(car => {
      const limitDays = car.maxDays || (car.campaign === "rk1" ? settings.rk1Days : settings.rk2Days);
      const daysIn = calculateDaysInAd(car.startedAt);
      const daysLeft = Math.max(0, limitDays - daysIn);
      countsByDayOffset[daysLeft] = (countsByDayOffset[daysLeft] || 0) + 1;
    });

    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      const d = new Date(today.getTime());
      d.setDate(d.getDate() + i);
      
      const count = countsByDayOffset[i] || 0;
      let status: "good" | "empty" | "overload" = "good";
      
      if (count === 0) status = "empty";
      else if (count > targetPerDay) status = "overload";

      daysArr.push({
        date: d,
        count,
        status,
        offset: i,
      });
    }
    return daysArr;
  }, [cars, settings, targetPerDay]);

  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

  return (
    <div className="bg-white p-2 sm:p-3 rounded-2xl border border-zinc-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-1.5 shrink-0 px-1">
        <CalendarDays className="w-4 h-4 text-zinc-500" />
        <span className="text-xs font-semibold text-zinc-800">График ротации</span>
      </div>

      <div className="flex-1 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar flex items-center gap-1">
        {timeline.map((day) => (
          <div
            key={day.offset}
            className={`flex flex-col items-center justify-center shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-md border transition-all ${
              day.offset === 0 
                ? "bg-zinc-900 border-zinc-900 text-white shadow-md" 
                : day.status === "overload"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : day.status === "empty"
                ? "bg-zinc-50/50 border-dashed border-zinc-200 text-zinc-400"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
            title={`${day.date.getDate()} ${months[day.date.getMonth()]}: ${day.count} авто`}
          >
            <span className={`text-[8px] sm:text-[9px] font-medium leading-none mb-0.5 ${day.offset === 0 ? "text-white/80" : "opacity-60"}`}>
              {day.offset === 0 ? "Сег" : `${day.date.getDate()} ${months[day.date.getMonth()]}`}
            </span>
            <span className="text-sm sm:text-base font-bold leading-none tracking-tight">
              {day.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
