"use client";

import { useMemo } from "react";
import { format, isAfter, isSameDay, isToday, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import type { CatalogCar, Lead } from "@/lib/types";
import { LeadRow } from "./views/LeadFocusView";
import { AdsScroller } from "@/components/ads/chrome";

type DayTab = "new" | "in_progress" | "visit" | "callback" | "no_answer" | "thinking";

function hourBucket(ts: number) {
  const h = new Date(ts).getHours();
  if (h < 12) return { key: "morning", label: "Утро", order: 1 };
  if (h < 17) return { key: "day", label: "День", order: 2 };
  return { key: "evening", label: "Вечер", order: 3 };
}

export function DayBoard({
  leads,
  cars,
  tab,
  filterDate,
  search,
  selectedId,
  onOpen,
  onOpenCar,
}: {
  leads: Lead[];
  cars: CatalogCar[];
  tab: DayTab;
  filterDate: Date;
  search: string;
  selectedId?: string | null;
  onOpen: (lead: Lead) => void;
  onOpenCar?: (car: CatalogCar) => void;
}) {
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const target = startOfDay(filterDate);
    const today = isToday(target);

    let rows = leads.filter((l) => l.status === tab);
    if (q) {
      rows = rows.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.car?.toLowerCase().includes(q) ||
          l.notes?.toLowerCase().includes(q),
      );
    }

    if (tab === "new") {
      const byDay: Record<string, { label: string; order: number; items: Lead[] }> = {};
      for (const lead of rows) {
        const d = startOfDay(new Date(lead.createdAt));
        const key = String(d.getTime());
        const label = isToday(d) ? "Сегодня" : format(d, "d MMMM", { locale: ru });
        if (!byDay[key]) byDay[key] = { label, order: -d.getTime(), items: [] };
        byDay[key].items.push(lead);
      }
      return Object.values(byDay)
        .map((g) => ({ ...g, items: g.items.sort((a, b) => b.createdAt - a.createdAt) }))
        .sort((a, b) => a.order - b.order);
    }

    rows = rows.filter((lead) => {
      const raw = lead.nextActionDate || lead.createdAt;
      const d = startOfDay(new Date(raw));
      if (today) return !isAfter(d, target);
      return isSameDay(d, target);
    });

    const buckets: Record<string, { label: string; order: number; items: Lead[] }> = {};
    for (const lead of rows) {
      const raw = lead.nextActionDate || lead.createdAt;
      const d = startOfDay(new Date(raw));
      let key = "time";
      let label = "Без времени";
      let order = 4;
      if (today && d.getTime() < target.getTime()) {
        key = "overdue";
        label = "Просрочено";
        order = 0;
      } else if (lead.nextActionDate) {
        const b = hourBucket(lead.nextActionDate);
        key = b.key;
        label = b.label;
        order = b.order;
      }
      if (!buckets[key]) buckets[key] = { label, order, items: [] };
      buckets[key].items.push(lead);
    }

    return Object.values(buckets)
      .map((g) => ({
        ...g,
        items: g.items.sort((a, b) => (a.nextActionDate || 0) - (b.nextActionDate || 0)),
      }))
      .sort((a, b) => a.order - b.order);
  }, [leads, tab, filterDate, search]);

  if (groups.length === 0 || groups.every((g) => g.items.length === 0)) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-sm text-leads-muted">
        {search ? "Ничего не нашлось" : "На этот день пусто"}
      </div>
    );
  }

  return (
    <AdsScroller className="h-full" contentClassName="pb-24">
      {groups.map((group) => (
        <section key={group.label} className="mb-2">
          <div className="sticky top-0 z-10 bg-[#f5f5f7]/90 px-4 py-2 backdrop-blur">
            <p className="text-[11px] font-semibold tracking-wide text-leads-muted uppercase">
              {group.label} <span className="text-leads-subtle">{group.items.length}</span>
            </p>
          </div>
          <div className="divide-y divide-leads-line bg-white md:mx-3 md:rounded-2xl md:ring-1 md:ring-leads-line">
            {group.items.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                cars={cars}
                selected={selectedId === lead.id}
                onOpen={() => onOpen(lead)}
                onOpenCar={onOpenCar}
              />
            ))}
          </div>
        </section>
      ))}
    </AdsScroller>
  );
}

export const DAY_TABS: { id: DayTab; label: string }[] = [
  { id: "new", label: "Новые" },
  { id: "in_progress", label: "В работе" },
  { id: "visit", label: "Приезд" },
  { id: "callback", label: "Перезвон" },
  { id: "no_answer", label: "Недозвон" },
  { id: "thinking", label: "Думает" },
];

export type { DayTab };
