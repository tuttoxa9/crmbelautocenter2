"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { qualityApi } from "@/lib/quality/client";
import { WEEKDAY_SHORT } from "@/lib/quality/dates";
import { laneLabel, type CrmPerson, type PersonWeek, type SmmLane } from "@/lib/quality/types";
import { calculatePriceTier, getPriceTierShort } from "@/lib/services/adsService";
import { cn } from "@/lib/utils";
import { CarThumb } from "@/components/ads/CarThumb";
import { AdsScroller, GhostBtn, Overlay, PrimaryBtn, Spinner } from "@/components/ads/chrome";

type Board = {
  todayKey: string;
  weekStart: string;
  weekKeys: string[];
  weekPeople: Record<string, PersonWeek>;
  people: CrmPerson[];
  team: TeamRow[];
  waiting: any[];
  ready: any[];
  unplanned: any[];
  organic: Record<string, Record<string, { stories: number; reels: number; posts: number }>>;
  me: CrmPerson | null;
  role: string;
};

type TeamRow = {
  person: CrmPerson;
  off: boolean;
  stories: { fact: number; norm: number };
  reels: { fact: number; norm: number };
  posts: { fact: number; norm: number };
  shoot: { fact: number; norm: number; cap: number; waiting: number };
  waiting: any[];
  shots: any[];
};

type Tab = "today" | "shoot" | "week" | "people";

export function QualityApp() {
  const { user, userRole, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("today");
  const [toast, setToast] = useState<string | null>(null);

  const isSmm = userRole === "smm";
  const isAdmin = userRole === "admin";

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await qualityApi.board();
      setBoard(data);
    } catch (err: any) {
      setError(err?.message || "Не загрузилось");
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (userRole === "commission") {
      router.replace("/commission");
      return;
    }
    if (isSmm && pathname.startsWith("/quality")) {
      router.replace("/goals");
      return;
    }
    if (isAdmin && pathname.startsWith("/goals")) {
      router.replace("/quality");
      return;
    }
    if (user) void load();
  }, [loading, user, userRole, pathname, router, isSmm, isAdmin, load]);

  const ping = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const run = async (fn: () => Promise<void>, ok?: string) => {
    try {
      setBusy(true);
      await fn();
      await load();
      if (ok) ping(ok);
    } catch (err: any) {
      ping(err?.message || "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !userRole) {
    return (
      <div className="ads-os flex h-full items-center justify-center">
        <Spinner large />
      </div>
    );
  }

  if (!board && error) {
    return (
      <div className="ads-os flex h-full flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-ads-muted">{error}</p>
        <PrimaryBtn onClick={() => void load()}>Ещё раз</PrimaryBtn>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="ads-os flex h-full items-center justify-center">
        <Spinner large />
      </div>
    );
  }

  return (
    <div className="ads-os flex h-full min-h-0 flex-col text-ads-ink">
      <header className="shrink-0 border-b border-ads-line/70 bg-ads-bg/80 px-5 py-3 backdrop-blur-xl sm:px-6">
        <p className="text-xs font-medium text-ads-subtle">{isSmm ? "Кабинет" : "Команда"}</p>
        <div className="mt-0.5 flex items-end justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{isSmm ? "Мои цели" : "Контроль качества"}</h1>
          <span className="font-mono text-xs tabular-nums text-ads-muted">{fmtDay(board.todayKey)}</span>
        </div>
        {isAdmin ? (
          <div className="mt-3 grid grid-cols-4 gap-0.5 rounded-xl bg-ads-surface p-0.5">
            {(
              [
                ["today", "Сегодня"],
                ["shoot", "Съёмка"],
                ["week", "Неделя"],
                ["people", "Люди"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "h-8 rounded-lg text-xs font-medium",
                  tab === id ? "bg-ads-card text-ads-ink shadow-ads-pill" : "text-ads-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <AdsScroller className="min-h-0 flex-1" contentClassName="px-4 py-4 sm:px-6">
        {isSmm ? (
          <MyDay board={board} busy={busy} onOrganic={(kind, delta) => run(() => qualityApi.organic({ kind, delta }), "")} onShot={(carId) => run(() => qualityApi.shoot({ action: "shot", carId }), "Снято")} />
        ) : tab === "today" ? (
          <TeamToday board={board} busy={busy} onOrganic={(uid, kind, delta) => run(() => qualityApi.organic({ uid, kind, delta }))} />
        ) : tab === "shoot" ? (
          <ShootDesk board={board} busy={busy} onPlan={(carId, plannedCampaign) => run(() => qualityApi.shoot({ action: "plan", carId, plannedCampaign }), "Линия задана")} />
        ) : tab === "week" ? (
          <WeekDesk board={board} busy={busy} onSave={(people) => run(() => qualityApi.saveWeek({ weekStart: board.weekStart, people }), "Неделя сохранена")} />
        ) : (
          <PeopleDesk onChanged={load} ping={ping} />
        )}
      </AdsScroller>

      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ads-ink px-4 py-2 text-sm text-ads-paper shadow-ads-float">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function MyDay({
  board,
  busy,
  onOrganic,
  onShot,
}: {
  board: Board;
  busy: boolean;
  onOrganic: (kind: "stories" | "reels" | "posts", delta: 1 | -1) => void;
  onShot: (carId: string) => void;
}) {
  const row = board.team[0];
  if (!row) {
    return <p className="py-16 text-center text-sm text-ads-subtle">Админ ещё не завёл ваш профиль SMM.</p>;
  }
  return (
    <div className="mx-auto max-w-lg space-y-4">
      {row.off ? (
        <div className="rounded-2xl bg-ads-card px-4 py-6 text-center text-sm text-ads-muted">Сегодня выходной</div>
      ) : null}
      <section className="overflow-hidden rounded-2xl bg-ads-card">
        <Meter label="Сторис сегодня" fact={row.stories.fact} norm={row.stories.norm} onMinus={() => onOrganic("stories", -1)} onPlus={() => onOrganic("stories", 1)} busy={busy} />
        <Meter label="Рилсы за неделю" fact={row.reels.fact} norm={row.reels.norm} onMinus={() => onOrganic("reels", -1)} onPlus={() => onOrganic("reels", 1)} busy={busy} />
        <Meter label="Посты за неделю" fact={row.posts.fact} norm={row.posts.norm} onMinus={() => onOrganic("posts", -1)} onPlus={() => onOrganic("posts", 1)} busy={busy} last />
      </section>
      <section>
        <h2 className="mb-2 px-1 text-xs font-medium text-ads-subtle">
          Съёмка {laneLabel(row.person.lane)} · {row.shoot.fact}/{row.shoot.norm || row.waiting.length}
        </h2>
        {row.waiting.length === 0 ? (
          <p className="rounded-2xl bg-ads-card px-4 py-8 text-center text-sm text-ads-subtle">
            {row.person.lane === "none" ? "Вам не назначена линия РК" : "Очередь пуста"}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-ads-card">
            {row.waiting.map((car: any, i: number) => (
              <CarLine key={car.id} car={car} border={i > 0}>
                <PrimaryBtn className="h-8 px-3 text-xs" disabled={busy} onClick={() => onShot(car.id)}>
                  Снял
                </PrimaryBtn>
              </CarLine>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TeamToday({
  board,
  busy,
  onOrganic,
}: {
  board: Board;
  busy: boolean;
  onOrganic: (uid: string, kind: "stories" | "reels" | "posts", delta: 1 | -1) => void;
}) {
  if (board.team.length === 0) {
    return <p className="py-16 text-center text-sm text-ads-subtle">Добавьте SMM во вкладке Люди.</p>;
  }
  return (
    <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
      {board.team.map((row) => (
        <article key={row.person.uid} className="rounded-2xl bg-ads-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ads-ink">{row.person.name}</p>
              <p className="text-xs text-ads-muted">{laneLabel(row.person.lane)}</p>
            </div>
            <StatusDot row={row} />
          </div>
          <div className="mt-3 space-y-2">
            <MiniMeter label="Сторис" fact={row.stories.fact} norm={row.stories.norm} onMinus={() => onOrganic(row.person.uid, "stories", -1)} onPlus={() => onOrganic(row.person.uid, "stories", 1)} busy={busy} />
            <MiniMeter label="Рилсы / нед" fact={row.reels.fact} norm={row.reels.norm} onMinus={() => onOrganic(row.person.uid, "reels", -1)} onPlus={() => onOrganic(row.person.uid, "reels", 1)} busy={busy} />
            <MiniMeter label="Съёмка" fact={row.shoot.fact} norm={row.shoot.norm} />
          </div>
          {row.waiting.length > 0 ? (
            <p className="mt-3 truncate text-xs text-ads-subtle">
              В очереди: {row.waiting.map((c: any) => c.name).join(", ")}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function ShootDesk({
  board,
  busy,
  onPlan,
}: {
  board: Board;
  busy: boolean;
  onPlan: (carId: string, plannedCampaign: "rk1" | "rk2" | null) => void;
}) {
  const waiting = board.waiting || [];
  if (waiting.length === 0) {
    return <p className="py-16 text-center text-sm text-ads-subtle">В «Ожидает» никого нет.</p>;
  }
  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl bg-ads-card">
      {waiting.map((car: any, i: number) => (
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
  );
}

function WeekDesk({
  board,
  busy,
  onSave,
}: {
  board: Board;
  busy: boolean;
  onSave: (people: Record<string, PersonWeek>) => void;
}) {
  const [draft, setDraft] = useState(board.weekPeople);
  useEffect(() => setDraft(board.weekPeople), [board.weekPeople]);
  const keys = board.weekKeys;

  const setCell = (uid: string, dateKey: string, patch: Partial<PersonWeek["days"][string]>) => {
    setDraft((prev) => {
      const person = prev[uid];
      if (!person) return prev;
      return {
        ...prev,
        [uid]: {
          ...person,
          days: { ...person.days, [dateKey]: { ...person.days[dateKey], ...patch } },
        },
      };
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {board.people.map((p) => {
        const w = draft[p.uid];
        if (!w) return null;
        return (
          <section key={p.uid} className="rounded-2xl bg-ads-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{p.name}</p>
              <label className="flex items-center gap-2 text-xs text-ads-muted">
                Рилсы / нед
                <input
                  type="number"
                  min={0}
                  className="h-8 w-14 rounded-lg bg-ads-surface px-2 font-mono text-sm text-ads-ink outline-none"
                  value={w.reelsPerWeek}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [p.uid]: { ...w, reelsPerWeek: Math.max(0, Number(e.target.value) || 0) },
                    }))
                  }
                />
              </label>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {keys.map((k, i) => {
                const cell = w.days[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCell(p.uid, k, { off: !cell.off, stories: cell.off ? 5 : 0, shootCap: cell.off ? 3 : 0 })}
                    className={cn(
                      "rounded-xl px-1 py-2 text-center",
                      cell.off ? "bg-ads-surface text-ads-subtle" : "bg-ads-bg",
                    )}
                  >
                    <p className="text-[10px] uppercase">{WEEKDAY_SHORT[i]}</p>
                    <p className="font-mono text-sm tabular-nums">{cell.off ? "вых" : cell.stories}</p>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ads-subtle">Нажмите день — выходной. Число = норма сторис.</p>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {keys.map((k) => {
                const cell = w.days[k];
                if (cell.off) return <div key={k} />;
                return (
                  <input
                    key={k}
                    type="number"
                    min={0}
                    value={cell.stories}
                    onChange={(e) => setCell(p.uid, k, { stories: Math.max(0, Number(e.target.value) || 0) })}
                    className="h-8 rounded-lg bg-ads-surface text-center font-mono text-xs outline-none"
                  />
                );
              })}
            </div>
          </section>
        );
      })}
      <PrimaryBtn className="w-full" disabled={busy} onClick={() => onSave(draft)}>
        {busy ? <Spinner /> : null}
        Сохранить неделю
      </PrimaryBtn>
    </div>
  );
}

function PeopleDesk({ onChanged, ping }: { onChanged: () => Promise<void> | void; ping: (t: string) => void }) {
  const [people, setPeople] = useState<CrmPerson[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", marker: "", lane: "rk1" as SmmLane });

  const load = useCallback(async () => {
    const data = await qualityApi.people();
    setPeople((data.people || []).filter((p: CrmPerson) => p.role === "smm"));
  }, []);

  useEffect(() => {
    void load().catch((e) => ping(e.message));
  }, [load, ping]);

  const create = async () => {
    try {
      setBusy(true);
      await qualityApi.createPerson({ ...form, role: "smm" });
      setOpen(false);
      setForm({ name: "", email: "", password: "", marker: "", lane: "rk1" });
      await load();
      await onChanged();
      ping("Человек добавлен");
    } catch (e: any) {
      ping(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <PrimaryBtn className="w-full" onClick={() => setOpen(true)}>
        Новый SMM
      </PrimaryBtn>
      {people.length === 0 ? (
        <p className="py-10 text-center text-sm text-ads-subtle">Пока никого. Добавьте человека — он получит логин и кабинет «Мои цели».</p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-ads-card">
          {people.map((p, i) => (
            <div key={p.uid} className={cn("flex items-center justify-between gap-3 px-4 py-3", i > 0 && "border-t border-ads-line")}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="truncate text-xs text-ads-muted">
                  {p.email} · {laneLabel(p.lane)}
                  {p.marker ? ` · //${p.marker}` : ""}
                </p>
              </div>
              <GhostBtn
                className="h-8 px-2 text-xs"
                onClick={() =>
                  void qualityApi
                    .patchPerson(p.uid, { active: !p.active })
                    .then(() => load())
                    .then(onChanged)
                }
              >
                {p.active ? "Выкл" : "Вкл"}
              </GhostBtn>
            </div>
          ))}
        </div>
      )}

      <Overlay open={open} onClose={() => setOpen(false)}>
        <div className="ads-enter relative w-full max-w-lg rounded-t-3xl bg-ads-bg p-5 shadow-ads-float sm:rounded-3xl">
          <h2 className="text-lg font-semibold">Новый SMM</h2>
          <div className="mt-4 space-y-3">
            <Field label="Имя" value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
            <Field label="Почта" value={form.email} onChange={(email) => setForm((f) => ({ ...f, email }))} />
            <Field label="Пароль" value={form.password} onChange={(password) => setForm((f) => ({ ...f, password }))} type="password" />
            <Field label="Код в подписи" value={form.marker} onChange={(marker) => setForm((f) => ({ ...f, marker }))} placeholder="sa" />
            <div>
              <p className="mb-1.5 text-xs font-medium text-ads-muted">Линия съёмки</p>
              <div className="grid grid-cols-4 gap-0.5 rounded-xl bg-ads-surface p-0.5">
                {(["rk1", "rk2", "both", "none"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, lane: id }))}
                    className={cn("h-8 rounded-lg text-xs", form.lane === id ? "bg-ads-card shadow-ads-pill" : "text-ads-muted")}
                  >
                    {laneLabel(id)}
                  </button>
                ))}
              </div>
            </div>
            <PrimaryBtn className="w-full" disabled={busy} onClick={() => void create()}>
              {busy ? <Spinner /> : null}
              Создать
            </PrimaryBtn>
          </div>
        </div>
      </Overlay>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ads-muted">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl bg-ads-card px-3 text-sm text-ads-ink outline-none"
      />
    </label>
  );
}

function CarLine({ car, border, children }: { car: any; border?: boolean; children?: ReactNode }) {
  const tier = car.priceTier || calculatePriceTier(car.priceUsd);
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2.5", border && "border-t border-ads-line")}>
      <CarThumb name={car.name} photoUrl={car.photoUrl} className="h-9 w-12" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{car.name}</p>
        <p className="flex items-center gap-1.5 text-xs text-ads-muted">
          <span className="rounded-md bg-ads-surface px-1.5 py-0.5 font-medium text-ads-ink">{getPriceTierShort(tier)}</span>
          {car.plannedCampaign === "rk1" ? "РК 1" : car.plannedCampaign === "rk2" ? "РК 2" : "без линии"}
        </p>
      </div>
      {children}
    </div>
  );
}

function LaneChip({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-8 rounded-lg px-2.5 text-xs font-medium",
        active ? "bg-ads-ink text-ads-paper" : "bg-ads-surface text-ads-ink",
      )}
    >
      {children}
    </button>
  );
}

function Meter({
  label,
  fact,
  norm,
  onMinus,
  onPlus,
  busy,
  last,
}: {
  label: string;
  fact: number;
  norm: number;
  onMinus: () => void;
  onPlus: () => void;
  busy?: boolean;
  last?: boolean;
}) {
  const pct = norm <= 0 ? (fact > 0 ? 100 : 0) : Math.min(100, (fact / norm) * 100);
  return (
    <div className={cn("px-4 py-3", !last && "border-b border-ads-line")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ads-ink">{label}</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={busy || fact <= 0} onClick={onMinus} className="flex size-8 items-center justify-center rounded-lg bg-ads-surface text-lg disabled:opacity-30">
            −
          </button>
          <span className="min-w-12 text-center font-mono text-sm tabular-nums">
            {fact}/{norm}
          </span>
          <button type="button" disabled={busy} onClick={onPlus} className="flex size-8 items-center justify-center rounded-lg bg-ads-surface text-lg disabled:opacity-30">
            +
          </button>
        </div>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ads-surface">
        <div className="h-full bg-ads-ink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniMeter({
  label,
  fact,
  norm,
  onMinus,
  onPlus,
  busy,
}: {
  label: string;
  fact: number;
  norm: number;
  onMinus?: () => void;
  onPlus?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-ads-muted">{label}</span>
      <span className="flex items-center gap-1.5">
        {onMinus ? (
          <button type="button" disabled={busy} onClick={onMinus} className="flex size-6 items-center justify-center rounded-md bg-ads-surface text-sm">
            −
          </button>
        ) : null}
        <span className="font-mono tabular-nums text-ads-ink">
          {fact}/{norm}
        </span>
        {onPlus ? (
          <button type="button" disabled={busy} onClick={onPlus} className="flex size-6 items-center justify-center rounded-md bg-ads-surface text-sm">
            +
          </button>
        ) : null}
      </span>
    </div>
  );
}

function StatusDot({ row }: { row: TeamRow }) {
  const tone = row.off
    ? "bg-ads-line-strong"
    : row.stories.fact >= row.stories.norm && row.reels.fact >= row.reels.norm && row.shoot.fact >= row.shoot.norm
      ? "bg-ads-ok"
      : row.stories.fact === 0 && row.stories.norm > 0
        ? "bg-ads-danger"
        : "bg-ads-mid";
  return <span className={cn("mt-1 size-2.5 rounded-full", tone)} />;
}

function fmtDay(key: string) {
  const [, m, d] = key.split("-");
  return `${Number(d)}.${m}`;
}
