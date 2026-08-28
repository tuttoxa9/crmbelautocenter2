"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Check } from "lucide-react";
import { type AdCampaignType, type AdCar, type AdsSettings } from "@/lib/types";
import { MONTHS_LONG, getCalendarDaysLeft, getMinskDateKey } from "@/lib/services/adsService";
import { cn } from "@/lib/utils";
import { WorkTask } from "./WorkTask";
import { RotationTimeline } from "./RotationTimeline";
import { CarThumb } from "./CarThumb";
import { GhostBtn, PrimaryBtn, Spinner } from "./chrome";

export function TodayShift({
  cars,
  settings,
  busyIds,
  balancing,
  onSwitch,
  onBalance,
  onOpenWarehouse,
  onDayClick,
}: {
  cars: AdCar[];
  settings: AdsSettings;
  busyIds: Set<string>;
  balancing: boolean;
  onSwitch: (car: AdCar, campaign: AdCampaignType) => void;
  onBalance: () => void;
  onOpenWarehouse: () => void;
  onDayClick: (offset: number, date: Date, dayCars: AdCar[]) => void;
}) {
  const overdue = cars.filter((c) => isAir(c) && daysLeft(c) < 0);
  const dueToday = cars.filter((c) => isAir(c) && daysLeft(c) === 0);
  const waiting = cars.filter((c) => c.campaign === "waiting_video");
  const ready = cars.filter((c) => c.campaign === "ready_for_ads");
  const workCount = overdue.length + dueToday.length;
  const todayKey = getMinskDateKey();
  const [, m, d] = todayKey.split("-").map(Number);
  const dateLabel = `${d} ${MONTHS_LONG[(m || 1) - 1]}`;
  const [shootTab, setShootTab] = useState<"waiting" | "ready">("waiting");
  const shootList = shootTab === "waiting" ? waiting : ready;

  return (
    <div className="ads-pane ads-shift overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-medium text-ads-subtle">Смена</p>
        <h2 className="mt-0.5 text-xl leading-tight font-semibold tracking-tight text-ads-ink">{dateLabel}</h2>
        <p className="mt-1 text-sm text-ads-muted">
          {workCount === 0
            ? "Ротировать некого. Можно снимать или взять авто со склада."
            : `Закрыть день: ${workCount} ${plural(workCount, "машина", "машины", "машин")}.`}
        </p>
      </div>

      {workCount === 0 ? (
        <div className="mx-4 mb-4 rounded-2xl bg-ads-bg px-4 py-8 text-center">
          <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-ads-card shadow-ads-pill">
            <Check className="size-4 text-ads-ink" />
          </div>
          <p className="mt-3 text-sm font-medium text-ads-ink">Сегодня чисто</p>
          <p className="mt-1 text-xs text-ads-muted">Ближайшие ротации — на графике нагрузки.</p>
          <PrimaryBtn className="mt-4" onClick={onOpenWarehouse}>
            Взять со склада
          </PrimaryBtn>
        </div>
      ) : (
        <div>
          {overdue.length > 0 && (
            <Group title={`Просрочено · ${overdue.length}`}>
              {overdue.map((car) => (
                <WorkTask
                  key={car.id}
                  car={car}
                  settings={settings}
                  busy={!!car.id && busyIds.has(car.id)}
                  onSwitch={onSwitch}
                />
              ))}
            </Group>
          )}
          {dueToday.length > 0 && (
            <Group title={`Сегодня · ${dueToday.length}`}>
              {dueToday.map((car) => (
                <WorkTask
                  key={car.id}
                  car={car}
                  settings={settings}
                  busy={!!car.id && busyIds.has(car.id)}
                  onSwitch={onSwitch}
                />
              ))}
            </Group>
          )}
        </div>
      )}

      <div className="mx-4 my-1 h-px bg-ads-line" />

      <div className="px-4 py-3">
        <h3 className="mb-2 px-1 text-xs font-medium text-ads-subtle">Съёмка</h3>
        <div className="mb-2 grid grid-cols-2 gap-0.5 rounded-xl bg-ads-surface p-0.5">
          <ShootTab
            active={shootTab === "waiting"}
            count={waiting.length}
            onClick={() => setShootTab("waiting")}
          >
            Ожидает
          </ShootTab>
          <ShootTab
            active={shootTab === "ready"}
            count={ready.length}
            onClick={() => setShootTab("ready")}
          >
            Отснято
          </ShootTab>
        </div>
        {shootList.length === 0 ? (
          <p className="px-1 py-3 text-sm text-ads-subtle">
            {shootTab === "waiting" ? "Некого снимать" : "Нет отснятых"}
          </p>
        ) : (
          <div>
            {shootList.map((car) =>
              shootTab === "waiting" ? (
                <ShootRow
                  key={car.id}
                  car={car}
                  label="Ждёт ролик"
                  action="Отснято"
                  busy={!!car.id && busyIds.has(car.id)}
                  onClick={() => onSwitch(car, "ready_for_ads")}
                />
              ) : (
                <ShootRow
                  key={car.id}
                  car={car}
                  label="Готово к эфиру"
                  action="В РК 1"
                  busy={!!car.id && busyIds.has(car.id)}
                  onClick={() => onSwitch(car, "rk1")}
                />
              ),
            )}
          </div>
        )}
      </div>

      <div className="mx-4 my-1 h-px bg-ads-line" />

      <div className="px-4 pt-3 pb-4">
        <div className="mb-2 flex items-end justify-between gap-3 px-1">
          <div>
            <h3 className="text-sm font-medium text-ads-ink">Нагрузка</h3>
            <p className="text-xs text-ads-muted">Не больше {settings.targetCarsPerDay || 3} в день</p>
          </div>
          <GhostBtn className="h-8 px-2.5 text-xs" onClick={onBalance} disabled={balancing}>
            {balancing ? <Spinner /> : null}
            {balancing ? "Раскладываю" : "Разложить"}
          </GhostBtn>
        </div>
        <RotationTimeline cars={cars} settings={settings} days={14} onDayClick={onDayClick} />
      </div>
    </div>
  );
}

function ShootTab({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors",
        active ? "bg-ads-card text-ads-ink shadow-ads-pill" : "text-ads-muted hover:text-ads-ink",
      )}
    >
      {children}
      <span className="font-mono tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="px-5 pb-1 text-xs font-medium text-ads-subtle">{title}</h3>
      <div className="divide-y divide-ads-line/80">{children}</div>
    </section>
  );
}

function ShootRow({
  car,
  label,
  action,
  busy,
  onClick,
}: {
  car: AdCar;
  label: string;
  action: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative flex items-center gap-2.5 rounded-xl px-1 py-1.5">
      <CarThumb name={car.name} photoUrl={car.photoUrl} className="h-9 w-12" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ads-ink">{car.name}</p>
        <p className="text-xs text-ads-muted">{label}</p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className="inline-flex h-8 items-center rounded-lg bg-ads-ink px-2.5 text-xs font-medium text-ads-paper disabled:opacity-40"
      >
        {busy ? <Spinner /> : action}
      </button>
    </div>
  );
}

function isAir(c: AdCar) {
  return c.campaign === "rk1" || c.campaign === "rk2";
}
function daysLeft(c: AdCar) {
  return getCalendarDaysLeft(c.targetRotationDate, c.startedAt, c.maxDays);
}
function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
