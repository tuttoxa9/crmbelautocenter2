"use client";

import { useEffect, useState } from "react";
import { addDaysToDateKey } from "@/lib/services/adsService";
import { qualityApi } from "@/lib/quality/client";
import { fmtWeekLabel, WEEKDAY_SHORT, weekKeys } from "@/lib/quality/dates";
import { defaultDay, type DayPlan, type PersonWeek } from "@/lib/quality/types";
import { GhostBtn, PrimaryBtn, Spinner } from "@/components/ads/chrome";
import { cn } from "@/lib/utils";
import type { Board } from "./boardTypes";

const ROWS: { key: keyof Pick<DayPlan, "stories" | "reels" | "posts" | "shootCap">; label: string }[] = [
  { key: "stories", label: "Сторис" },
  { key: "reels", label: "Рилсы" },
  { key: "posts", label: "Посты" },
  { key: "shootCap", label: "Съёмка" },
];

export function PlanPane({ board, busy, onSaved }: { board: Board; busy: boolean; onSaved: () => void }) {
  const [start, setStart] = useState(board.weekStart);
  const [draft, setDraft] = useState(board.weekPeople);
  const [saving, setSaving] = useState(false);
  const keys = weekKeys(start);

  useEffect(() => {
    setDraft(board.weekPeople);
    setStart(board.weekStart);
  }, [board.weekPeople, board.weekStart]);

  const loadWeek = async (weekStart: string) => {
    const data = await qualityApi.week(weekStart);
    setStart(weekStart);
    setDraft(data.week.people);
  };

  const setDay = (uid: string, dateKey: string, patch: Partial<DayPlan>) => {
    setDraft((prev) => {
      const person = prev[uid] || { days: {} };
      const cur = person.days[dateKey] || defaultDay(keys.indexOf(dateKey));
      return { ...prev, [uid]: { days: { ...person.days, [dateKey]: { ...cur, ...patch } } } };
    });
  };

  const resetPerson = (uid: string, mode: "template" | "clear") => {
    const days: PersonWeek["days"] = {};
    keys.forEach((k, i) => {
      days[k] = mode === "clear" ? { stories: 0, reels: 0, posts: 0, shootCap: 0, off: true, note: "" } : defaultDay(i);
    });
    setDraft((prev) => ({ ...prev, [uid]: { days } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await qualityApi.saveWeek({ weekStart: start, people: draft });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const copyPrev = async () => {
    setSaving(true);
    try {
      const from = addDaysToDateKey(start, -7);
      await qualityApi.copyWeek(from, start);
      await loadWeek(start);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <GhostBtn className="h-8 px-2 text-xs" onClick={() => void loadWeek(addDaysToDateKey(start, -7))}>
            ←
          </GhostBtn>
          <p className="min-w-28 text-center text-sm font-medium">{fmtWeekLabel(start)}</p>
          <GhostBtn className="h-8 px-2 text-xs" onClick={() => void loadWeek(addDaysToDateKey(start, 7))}>
            →
          </GhostBtn>
        </div>
        <div className="flex gap-1">
          <GhostBtn className="h-8 px-3 text-xs" disabled={saving} onClick={() => void copyPrev()}>
            С прошлой недели
          </GhostBtn>
          <PrimaryBtn className="h-8 px-3 text-xs" disabled={saving || busy} onClick={() => void save()}>
            {saving ? <Spinner /> : null}
            Сохранить план
          </PrimaryBtn>
        </div>
      </div>

      {board.people.length === 0 ? (
        <p className="py-12 text-center text-sm text-ads-subtle">Нет людей — некуда ставить цели.</p>
      ) : null}

      {board.people.map((p) => {
        const w = draft[p.uid];
        if (!w) return null;
        return (
          <section key={p.uid} className="rounded-2xl bg-ads-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{p.name}</p>
              <div className="flex gap-1">
                <GhostBtn className="h-7 px-2 text-[11px]" onClick={() => resetPerson(p.uid, "template")}>
                  Шаблон
                </GhostBtn>
                <GhostBtn className="h-7 px-2 text-[11px]" onClick={() => resetPerson(p.uid, "clear")}>
                  Очистить
                </GhostBtn>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-separate border-spacing-1 text-center">
                <thead>
                  <tr>
                    <th className="w-20" />
                    {keys.map((k, i) => {
                      const cell = w.days[k];
                      return (
                        <th key={k}>
                          <button
                            type="button"
                            onClick={() =>
                              setDay(p.uid, k, cell.off ? defaultDay(i) : { stories: 0, reels: 0, posts: 0, shootCap: 0, off: true, note: cell.note })
                            }
                            className={cn(
                              "w-full rounded-lg py-1.5 text-[11px] font-medium uppercase",
                              cell.off ? "bg-ads-surface text-ads-subtle" : "bg-ads-bg text-ads-ink",
                            )}
                          >
                            {WEEKDAY_SHORT[i]}
                            <span className="block font-normal lowercase">{cell.off ? "вых" : ""}</span>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.key}>
                      <td className="text-left text-[11px] text-ads-muted">{row.label}</td>
                      {keys.map((k) => {
                        const cell = w.days[k];
                        return (
                          <td key={k}>
                            <input
                              type="number"
                              min={0}
                              disabled={cell.off}
                              value={cell.off ? 0 : cell[row.key]}
                              onChange={(e) => setDay(p.uid, k, { [row.key]: Math.max(0, Number(e.target.value) || 0) })}
                              className="h-9 w-full rounded-lg bg-ads-surface text-center font-mono text-sm outline-none disabled:opacity-30"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="text-left text-[11px] text-ads-muted">Заметка</td>
                    {keys.map((k) => (
                      <td key={k}>
                        <input
                          value={w.days[k].note}
                          disabled={w.days[k].off}
                          onChange={(e) => setDay(p.uid, k, { note: e.target.value })}
                          className="h-9 w-full rounded-lg bg-ads-surface px-1.5 text-xs outline-none disabled:opacity-30"
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-ads-subtle">Шапка дня — выходной / рабочий. Очистить снимает всю неделю. Шаблон — 5 сторис и рилсы пн/ср/пт.</p>
          </section>
        );
      })}
    </div>
  );
}
