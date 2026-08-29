"use client";

import { useMemo } from "react";
import { format, isAfter, isSameDay, isToday, isYesterday, startOfDay } from "date-fns";
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

function overdueDayLabel(d: Date) {
  if (isYesterday(d)) return "Вчера";
  return format(d, "d MMMM, EEE", { locale: ru });
}

type BoardGroup = {
  key: string;
  label: string;
  order: number;
  items: Lead[];
  subgroups?: { key: string; label: string; items: Lead[] }[];
  showFullDate?: boolean;
};

export function DayBoard({
  leads,
  cars,
  tab,
  filterDate,
  search,
  selectedId,
  highlightId,
  onOpen,
  onOpenCar,
}: {
  leads: Lead[];
  cars: CatalogCar[];
  tab: DayTab;
  filterDate: Date;
  search: string;
  selectedId?: string | null;
  highlightId?: string | null;
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
      const byDay: Record<string, BoardGroup> = {};
      for (const lead of rows) {
        const d = startOfDay(new Date(lead.createdAt));
        const key = String(d.getTime());
        const label = isToday(d) ? "Сегодня" : format(d, "d MMMM", { locale: ru });
        if (!byDay[key]) byDay[key] = { key, label, order: -d.getTime(), items: [] };
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

    const overdueByDay: Record<string, { key: string; label: string; day: number; items: Lead[] }> = {};
    const buckets: Record<string, BoardGroup> = {};

    for (const lead of rows) {
      const raw = lead.nextActionDate || lead.createdAt;
      const d = startOfDay(new Date(raw));
      if (today && d.getTime() < target.getTime()) {
        const key = String(d.getTime());
        if (!overdueByDay[key]) {
          overdueByDay[key] = { key, label: overdueDayLabel(d), day: d.getTime(), items: [] };
        }
        overdueByDay[key].items.push(lead);
        continue;
      }
      let key = "none";
      let label = "Без времени";
      let order = 4;
      if (lead.nextActionDate) {
        const b = hourBucket(lead.nextActionDate);
        key = b.key;
        label = b.label;
        order = b.order;
      }
      if (!buckets[key]) buckets[key] = { key, label, order, items: [] };
      buckets[key].items.push(lead);
    }

    const result: BoardGroup[] = [];
    const overdueDays = Object.values(overdueByDay)
      .map((g) => ({
        ...g,
        items: g.items.sort((a, b) => (b.nextActionDate || 0) - (a.nextActionDate || 0)),
      }))
      .sort((a, b) => b.day - a.day);

    if (overdueDays.length > 0) {
      result.push({
        key: "overdue",
        label: "Просрочено",
        order: 0,
        items: overdueDays.flatMap((g) => g.items),
        subgroups: overdueDays,
        showFullDate: true,
      });
    }

    result.push(
      ...Object.values(buckets)
        .map((g) => ({
          ...g,
          items: g.items.sort((a, b) => (a.nextActionDate || 0) - (b.nextActionDate || 0)),
        }))
        .sort((a, b) => a.order - b.order),
    );

    return result;
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
        <section key={group.key} className="mb-2">
          <div className="sticky top-0 z-10 bg-[#f5f5f7]/90 px-4 py-2 backdrop-blur">
            <p className="text-[11px] font-semibold tracking-wide text-leads-muted uppercase">
              {group.label} <span className="text-leads-subtle">{group.items.length}</span>
            </p>
          </div>
          {group.subgroups ? (
            group.subgroups.map((sub) => (
              <div key={sub.key} className="mb-2">
                <p className="px-4 py-1.5 text-[12px] font-semibold text-leads-ink md:px-5">
                  {sub.label} <span className="font-medium text-leads-subtle">{sub.items.length}</span>
                </p>
                <div className="divide-y divide-leads-line bg-white md:mx-3 md:rounded-2xl md:ring-1 md:ring-leads-line">
                  {sub.items.map((lead) => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      cars={cars}
                      selected={selectedId === lead.id}
                      highlight={highlightId === lead.id}
                      showFullDate
                      onOpen={() => onOpen(lead)}
                      onOpenCar={onOpenCar}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="divide-y divide-leads-line bg-white md:mx-3 md:rounded-2xl md:ring-1 md:ring-leads-line">
              {group.items.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  cars={cars}
                  selected={selectedId === lead.id}
                  highlight={highlightId === lead.id}
                  onOpen={() => onOpen(lead)}
                  onOpenCar={onOpenCar}
                />
              ))}
            </div>
          )}
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
