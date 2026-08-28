"use client";

import { addDays, format, isToday, startOfDay, subDays } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function DateStepper({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  const today = isToday(value);
  return (
    <div className="flex items-center gap-0.5 rounded-xl bg-white ring-1 ring-leads-line p-0.5">
      <button
        type="button"
        onClick={() => onChange(subDays(value, 1))}
        className="flex size-8 items-center justify-center rounded-lg text-leads-muted hover:bg-zinc-100 hover:text-leads-ink"
        title="Предыдущий день"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange(startOfDay(new Date()))}
        className={cn(
          "min-w-[108px] rounded-lg px-3 py-1.5 text-[13px] font-semibold",
          today ? "bg-zinc-900 text-white" : "text-leads-ink hover:bg-zinc-100",
        )}
      >
        {today ? "Сегодня" : format(value, "d MMM, EEE", { locale: ru })}
      </button>
      <button
        type="button"
        onClick={() => onChange(addDays(value, 1))}
        className="flex size-8 items-center justify-center rounded-lg text-leads-muted hover:bg-zinc-100 hover:text-leads-ink"
        title="Следующий день"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

const TIMES = ["10:00", "11:00", "12:00", "14:00", "16:00", "18:00"];

function atTime(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function DatePresets({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (ts: number | null) => void;
}) {
  const selected = value ? new Date(value) : null;
  const today = startOfDay(new Date());
  const days = [
    { label: "Сегодня", date: today },
    { label: "Завтра", date: addDays(today, 1) },
    { label: format(addDays(today, 2), "EEE", { locale: ru }), date: addDays(today, 2) },
    { label: format(addDays(today, 3), "EEE", { locale: ru }), date: addDays(today, 3) },
  ];

  const currentDay = selected ? startOfDay(selected).getTime() : null;
  const currentTime = selected ? format(selected, "HH:mm") : "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {days.map((d) => {
          const active = currentDay === d.date.getTime();
          return (
            <button
              key={d.label}
              type="button"
              onClick={() => onChange(atTime(d.date, currentTime && TIMES.includes(currentTime) ? currentTime : "12:00"))}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium ring-1",
                active ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-leads-ink ring-leads-line hover:bg-zinc-50",
              )}
            >
              {d.label}
            </button>
          );
        })}
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-leads-muted hover:text-leads-ink"
          >
            Сбросить
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TIMES.map((t) => {
          const active = currentTime === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                const base = selected ? startOfDay(selected) : today;
                onChange(atTime(base, t));
              }}
              className={cn(
                "rounded-lg px-2.5 py-1 font-mono text-[11px] ring-1",
                active ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-leads-muted ring-leads-line hover:text-leads-ink",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
      <input
        type="datetime-local"
        className="h-10 w-full rounded-xl bg-white px-3 text-[13px] text-leads-ink ring-1 ring-leads-line outline-none focus:ring-zinc-400"
        value={selected ? format(selected, "yyyy-MM-dd'T'HH:mm") : ""}
        onChange={(e) => {
          if (!e.target.value) {
            onChange(null);
            return;
          }
          const d = new Date(e.target.value);
          if (!Number.isNaN(d.getTime())) onChange(d.getTime());
        }}
      />
    </div>
  );
}
