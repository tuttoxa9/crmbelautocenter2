"use client";

import { useState } from "react";
import { qualityApi } from "@/lib/quality/client";
import { laneLabel } from "@/lib/quality/types";
import { cn } from "@/lib/utils";
import { GhostBtn, PrimaryBtn } from "@/components/ads/chrome";
import { CarLine, Meter, StatusDot } from "./ui";
import type { Board, TeamRow } from "./boardTypes";

export function ShiftPane({
  board,
  busy,
  onOrganic,
  onReload,
  ping,
  onEditPerson,
}: {
  board: Board;
  busy: boolean;
  onOrganic: (uid: string, kind: "stories" | "reels" | "posts", delta: 1 | -1) => void;
  onReload: () => Promise<void>;
  ping: (t: string) => void;
  onEditPerson: (uid: string) => void;
}) {
  const [sel, setSel] = useState<string | null>(board.team[0]?.person.uid || null);
  const row = board.team.find((t) => t.person.uid === sel) || null;
  const [task, setTask] = useState("");

  if (board.team.length === 0) {
    return <p className="py-16 text-center text-sm text-ads-subtle">Сначала добавьте людей во вкладке Команда.</p>;
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-1">
        {board.team.map((t) => {
          const ok = !t.off && t.stories.fact >= t.stories.norm && t.reels.fact >= t.reels.norm && t.shoot.fact >= t.shoot.norm;
          const bad = !t.off && t.stories.norm > 0 && t.stories.fact === 0;
          return (
            <button
              key={t.person.uid}
              type="button"
              onClick={() => setSel(t.person.uid)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left",
                sel === t.person.uid ? "bg-ads-card shadow-ads-pill" : "hover:bg-ads-card/70",
              )}
            >
              <StatusDot off={t.off} ok={ok} bad={bad} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.person.name}</p>
                <p className="truncate text-[11px] text-ads-muted">
                  {t.off ? "выходной" : `сторис ${t.stories.fact}/${t.stories.norm} · съёмка ${t.shoot.fact}/${t.shoot.norm || t.waiting.length}`}
                </p>
              </div>
            </button>
          );
        })}
      </aside>

      {row ? (
        <PersonDay
          row={row}
          busy={busy}
          task={task}
          setTask={setTask}
          onOrganic={onOrganic}
          onReload={onReload}
          ping={ping}
          onEdit={() => onEditPerson(row.person.uid)}
        />
      ) : null}
    </div>
  );
}

function PersonDay({
  row,
  busy,
  task,
  setTask,
  onOrganic,
  onReload,
  ping,
  onEdit,
}: {
  row: TeamRow;
  busy: boolean;
  task: string;
  setTask: (v: string) => void;
  onOrganic: (uid: string, kind: "stories" | "reels" | "posts", delta: 1 | -1) => void;
  onReload: () => Promise<void>;
  ping: (t: string) => void;
  onEdit: () => void;
}) {
  const uid = row.person.uid;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 rounded-2xl bg-ads-card px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">{row.person.name}</h2>
          <p className="text-xs text-ads-muted">
            {row.person.email} · {laneLabel(row.person.lane)}
            {row.person.marker ? ` · //${row.person.marker}` : ""}
          </p>
        </div>
        <GhostBtn className="h-8 px-3 text-xs" onClick={onEdit}>
          Аккаунт
        </GhostBtn>
      </div>

      {row.off ? <p className="rounded-2xl bg-ads-card px-4 py-4 text-sm text-ads-muted">Сегодня выходной — нормы нулевые.</p> : null}

      {row.note ? (
        <div className="rounded-2xl bg-ads-card px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ads-subtle">Заметка дня</p>
          <p className="mt-1 text-sm">{row.note}</p>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-ads-card divide-y divide-ads-line">
        <Meter label="Сторис" fact={row.stories.fact} norm={row.stories.norm} onMinus={() => onOrganic(uid, "stories", -1)} onPlus={() => onOrganic(uid, "stories", 1)} busy={busy} />
        <Meter label="Рилсы сегодня" fact={row.reelsToday.fact} norm={row.reelsToday.norm} onMinus={() => onOrganic(uid, "reels", -1)} onPlus={() => onOrganic(uid, "reels", 1)} busy={busy} hint={`Неделя ${row.reels.fact}/${row.reels.norm}`} />
        <Meter label="Посты / нед" fact={row.posts.fact} norm={row.posts.norm} onMinus={() => onOrganic(uid, "posts", -1)} onPlus={() => onOrganic(uid, "posts", 1)} busy={busy} />
        <Meter label="Съёмка" fact={row.shoot.fact} norm={row.shoot.norm} hint={row.waiting.length ? `в очереди ${row.waiting.length}` : "очередь пуста"} />
      </section>

      <section className="rounded-2xl bg-ads-card p-3">
        <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-ads-subtle">Задачи на сегодня</p>
        {row.tasks.length === 0 ? <p className="px-1 py-2 text-sm text-ads-subtle">Нет разовых задач</p> : null}
        {row.tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-2 px-1 py-1.5">
            <input type="checkbox" checked={t.done} onChange={() => void qualityApi.patchTask({ id: t.id, done: !t.done }).then(onReload)} />
            <span className={cn("flex-1 text-sm", t.done && "text-ads-subtle line-through")}>{t.title}</span>
            <button type="button" className="text-[11px] text-ads-danger" onClick={() => void qualityApi.deleteTask(t.id).then(onReload)}>
              удалить
            </button>
          </div>
        ))}
        <div className="mt-2 flex gap-2">
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Добавить задачу"
            className="h-10 flex-1 rounded-xl bg-ads-surface px-3 text-sm outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && task.trim()) {
                void qualityApi.addTask({ uid, title: task.trim() }).then(() => {
                  setTask("");
                  return onReload();
                });
              }
            }}
          />
          <PrimaryBtn
            className="h-10 px-3 text-xs"
            disabled={!task.trim()}
            onClick={() =>
              void qualityApi.addTask({ uid, title: task.trim() }).then(() => {
                setTask("");
                ping("Задача");
                return onReload();
              })
            }
          >
            Добавить
          </PrimaryBtn>
        </div>
      </section>

      {row.waiting.length > 0 ? (
        <section className="overflow-hidden rounded-2xl bg-ads-card">
          <p className="px-4 pt-3 text-[11px] font-medium uppercase tracking-wide text-ads-subtle">Его очередь съёмки</p>
          {row.waiting.map((car: any, i: number) => (
            <CarLine key={car.id} car={car} border={i > 0} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
