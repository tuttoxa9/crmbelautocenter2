"use client";

import { laneLabel } from "@/lib/quality/types";
import { CarLine, LaneChip } from "./ui";
import type { Board } from "./boardTypes";

export function ShootPane({
  board,
  busy,
  onPlan,
}: {
  board: Board;
  busy: boolean;
  onPlan: (carId: string, plannedCampaign: "rk1" | "rk2" | null) => void;
}) {
  const groups = [
    { id: "none", title: "Без линии", items: board.waiting.filter((c) => !c.plannedCampaign) },
    { id: "rk1", title: "РК 1", items: board.waiting.filter((c) => c.plannedCampaign === "rk1") },
    { id: "rk2", title: "РК 2", items: board.waiting.filter((c) => c.plannedCampaign === "rk2") },
  ];
  const readyToday = board.ready || [];

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <p className="text-sm text-ads-muted">
        Назначьте линию здесь — человек с этой РК увидит машину в своих целях и нажмёт «Снял». В рекламу ходить не нужно.
      </p>
      {groups.map((g) => (
        <section key={g.id}>
          <h3 className="mb-2 px-1 text-xs font-medium text-ads-subtle">
            {g.title} · {g.items.length}
          </h3>
          {g.items.length === 0 ? (
            <p className="rounded-2xl bg-ads-card px-4 py-5 text-sm text-ads-subtle">Пусто</p>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-ads-card">
              {g.items.map((car: any, i: number) => (
                <CarLine key={car.id} car={car} border={i > 0}>
                  <div className="flex gap-1">
                    <LaneChip active={car.plannedCampaign === "rk1"} disabled={busy} onClick={() => onPlan(car.id, car.plannedCampaign === "rk1" ? null : "rk1")}>
                      РК 1
                    </LaneChip>
                    <LaneChip active={car.plannedCampaign === "rk2"} disabled={busy} onClick={() => onPlan(car.id, car.plannedCampaign === "rk2" ? null : "rk2")}>
                      РК 2
                    </LaneChip>
                  </div>
                </CarLine>
              ))}
            </div>
          )}
        </section>
      ))}

      <section>
        <h3 className="mb-2 px-1 text-xs font-medium text-ads-subtle">Отснято, ещё не в эфире · {readyToday.length}</h3>
        {readyToday.length === 0 ? (
          <p className="rounded-2xl bg-ads-card px-4 py-5 text-sm text-ads-subtle">Пока пусто</p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-ads-card">
            {readyToday.map((car: any, i: number) => (
              <CarLine key={car.id} car={car} border={i > 0} />
            ))}
          </div>
        )}
      </section>

      <p className="px-1 text-[11px] text-ads-subtle">
        Кто в какой линии:{" "}
        {board.people
          .filter((p) => p.lane !== "none")
          .map((p) => `${p.name} — ${laneLabel(p.lane)}`)
          .join(" · ") || "никому не назначена"}
      </p>
    </div>
  );
}
