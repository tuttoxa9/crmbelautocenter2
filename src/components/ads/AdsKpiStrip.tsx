"use client";

import React from "react";

export interface AdsKpis {
  dueToday: number;
  overdue: number;
  rk1: number;
  rk2: number;
  waiting: number;
  ready: number;
  warehouse: number;
}

export function AdsKpiStrip({
  kpis,
  onDueClick,
  onOverdueClick,
}: {
  kpis: AdsKpis;
  onDueClick?: () => void;
  onOverdueClick?: () => void;
}) {
  const items = [
    {
      key: "overdue",
      label: "Просрочено",
      value: kpis.overdue,
      alert: kpis.overdue > 0,
      onClick: onOverdueClick,
    },
    {
      key: "due",
      label: "Сегодня",
      value: kpis.dueToday,
      alert: kpis.dueToday > 0,
      onClick: onDueClick,
    },
    { key: "rk1", label: "В РК 1", value: kpis.rk1 },
    { key: "rk2", label: "В РК 2", value: kpis.rk2 },
    { key: "waiting", label: "Съёмка", value: kpis.waiting },
    { key: "ready", label: "Отснято", value: kpis.ready },
    { key: "wh", label: "Склад", value: kpis.warehouse },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
      {items.map((item) => {
        const Comp = item.onClick ? "button" : "div";
        return (
          <Comp
            key={item.key}
            type={item.onClick ? "button" : undefined}
            onClick={item.onClick}
            className={`rounded-2xl border px-3 py-2.5 text-left ${
              item.alert
                ? "border-rose-200 bg-rose-50"
                : "border-zinc-200/80 bg-white"
            } ${item.onClick ? "hover:border-zinc-300" : ""}`}
          >
            <div className="text-[11px] font-medium text-zinc-500">{item.label}</div>
            <div
              className={`mt-0.5 text-xl font-semibold tabular-nums tracking-tight ${
                item.alert ? "text-rose-700" : "text-zinc-900"
              }`}
            >
              {item.value}
            </div>
          </Comp>
        );
      })}
    </div>
  );
}
