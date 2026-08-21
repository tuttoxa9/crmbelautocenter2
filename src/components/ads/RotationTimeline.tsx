import React, { useMemo } from "react";
import { AdCar, AdsSettings } from "@/lib/types";
import { calculateDaysInAd } from "@/lib/services/adsService";
import { CalendarDays, Wand2 } from "lucide-react";

interface RotationTimelineProps {
  cars: AdCar[];
  settings: AdsSettings;
  onDayClick?: (offset: number, date: Date, dayCars: AdCar[]) => void;
  onBalance?: () => void;
}

export function RotationTimeline({ cars, settings, onDayClick, onBalance }: RotationTimelineProps) {
  const targetPerDay = settings.targetCarsPerDay || 3;
  const DAYS_TO_SHOW = 30; // 30 дней вперед

  // Aggregate expiration dates for next 30 days
  const timeline = useMemo(() => {
    const daysArr = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeAdCars = cars.filter(c => c.campaign === "rk1" || c.campaign === "rk2");

    // Precalculate counts by days-from-today
    const carsByDayOffset: Record<number, AdCar[]> = {};
    activeAdCars.forEach(car => {
      const limitDays = car.maxDays || (car.campaign === "rk1" ? settings.rk1Days : settings.rk2Days);
      const daysIn = calculateDaysInAd(car.startedAt);
      const daysLeft = Math.max(0, limitDays - daysIn);
      if (!carsByDayOffset[daysLeft]) carsByDayOffset[daysLeft] = [];
      carsByDayOffset[daysLeft].push(car);
    });

    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      const d = new Date(today.getTime());
      d.setDate(d.getDate() + i);
      
      const dayCars = carsByDayOffset[i] || [];
      const count = dayCars.length;
      let status: "good" | "empty" | "overload" = "good";
      
      if (count === 0) status = "empty";
      else if (count > targetPerDay) status = "overload";

      daysArr.push({
        date: d,
        count,
        cars: dayCars,
        status,
        offset: i,
      });
    }
    return daysArr;
  }, [cars, settings, targetPerDay]);

  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden flex flex-col w-full">
      {/* Header */}
      <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-800">График ротации (план съёмок)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-400 font-medium hidden sm:inline-block">Нажмите на любой день, чтобы увидеть список машин</span>
          {onBalance && (
            <button 
              onClick={onBalance}
              className="flex items-center gap-1 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors shadow-2xs"
              title="Автоматически распределить нагрузку (макс 3 авто в день)"
            >
              <Wand2 className="w-3 h-3 text-amber-500" />
              Сбалансировать
            </button>
          )}
        </div>
      </div>

      {/* Compact Table Timeline */}
      <div className="overflow-x-auto custom-scrollbar">
        <div className="inline-flex min-w-full">
          {timeline.map((day) => (
            <button
              key={day.offset}
              onClick={() => onDayClick && onDayClick(day.offset, day.date, day.cars)}
              className="group flex flex-col min-w-[36px] sm:min-w-[42px] flex-1 border-r border-zinc-100 last:border-r-0 transition-colors focus:outline-none cursor-pointer"
              title={`${day.date.getDate()} ${months[day.date.getMonth()]}: ${day.count} авто`}
            >
              {/* Top: Date */}
              <div className={`w-full text-center py-1.5 border-b border-zinc-100 transition-colors ${
                day.offset === 0 
                  ? 'bg-zinc-900 text-white group-hover:bg-zinc-800' 
                  : 'bg-white group-hover:bg-zinc-50'
              }`}>
                 <span className={`block text-[9px] sm:text-[10px] font-medium leading-none ${
                   day.offset === 0 ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-800'
                 }`}>
                    {day.offset === 0 ? 'Сегодня' : `${day.date.getDate()} ${months[day.date.getMonth()]}`}
                 </span>
              </div>
              
              {/* Bottom: Count */}
              <div className={`w-full text-center py-2 transition-colors ${
                day.status === "overload" ? "bg-rose-50 text-rose-700 font-bold group-hover:bg-rose-100" :
                day.status === "empty" ? "bg-zinc-50/30 text-zinc-400 group-hover:bg-zinc-100/50" :
                day.offset === 0 ? "bg-zinc-50 text-zinc-900 font-bold group-hover:bg-zinc-100" :
                "bg-emerald-50/50 text-emerald-700 font-bold group-hover:bg-emerald-100/50"
              }`}>
                 <span className="text-xs sm:text-sm leading-none">{day.count}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
