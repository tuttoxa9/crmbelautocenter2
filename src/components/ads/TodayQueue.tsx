"use client";

import type { ReactNode } from "react";
import { Check, Plus } from "lucide-react";
import { type AdCampaignType, type AdCar, type AdsSettings, type TikTokDebt } from "@/lib/types";
import { MONTHS_LONG, calculatePriceTier, getCalendarDaysLeft, getMinskDateKey, getPriceTierShort } from "@/lib/services/adsService";
import { carFacts, otherAir, pluralCars, rotateLabel } from "@/lib/ads/copy";
import { cn } from "@/lib/utils";
import { CarThumb } from "./CarThumb";
import { CampaignBadge } from "./CampaignBadge";
import { AdsScroller, CatalogLink, PrimaryBtn, Spinner } from "./chrome";

export function TodayQueue({
  cars,
  settings,
  debts,
  busyIds,
  nextDueLabel,
  onRotate,
  onMarkShot,
  onAir,
  onClearDebt,
  onOpenWarehouse,
  onOpenAir,
  onOpenShoot,
}: {
  cars: AdCar[];
  settings: AdsSettings;
  debts: TikTokDebt[];
  busyIds: Set<string>;
  nextDueLabel?: string | null;
  onRotate: (car: AdCar, campaign: AdCampaignType) => void;
  onMarkShot: (car: AdCar) => void;
  onAir: (car: AdCar, campaign: AdCampaignType) => void;
  onClearDebt: (id: string) => void;
  onOpenWarehouse: () => void;
  onOpenAir: () => void;
  onOpenShoot: () => void;
}) {
  const todayKey = getMinskDateKey();
  const [, m, d] = todayKey.split("-").map(Number);
  const dateLabel = `${d} ${MONTHS_LONG[(m || 1) - 1]}`;
  const overdue = cars.filter((c) => isAir(c) && daysLeft(c) < 0);
  const dueToday = cars.filter((c) => isAir(c) && daysLeft(c) === 0);
  const waiting = cars.filter((c) => c.campaign === "waiting_video");
  const ready = cars.filter((c) => c.campaign === "ready_for_ads");
  const todayDebts = debts.filter((d) => d.dateKey === todayKey);
  const workCount = overdue.length + dueToday.length + Math.min(waiting.length, 6) + todayDebts.length;
  const airCount = cars.filter((c) => isAir(c)).length;

  return (
    <div className="ads-pane flex h-auto min-h-0 flex-col overflow-visible lg:h-full lg:overflow-hidden">
      <AdsScroller nested className="min-h-0 flex-1">
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs font-medium text-ads-subtle">Сегодня</p>
          <h2 className="mt-0.5 text-xl leading-tight font-semibold tracking-tight text-ads-ink">{dateLabel}</h2>
          <p className="mt-1 text-sm text-ads-muted">
            {workCount === 0
              ? nextDueLabel
                ? `Дел нет. Ближайшая смена — ${nextDueLabel}.`
                : "Дел нет. Можно снять ролик или взять авто с сайта."
              : `Сделать: ${overdue.length + dueToday.length + waiting.length + todayDebts.length} ${pluralCars(overdue.length + dueToday.length + waiting.length + todayDebts.length)}.`}
          </p>
        </div>

        {workCount === 0 ? (
          <div className="mx-4 mb-4 rounded-2xl bg-ads-bg px-4 py-8 text-center">
            <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-ads-card shadow-ads-pill">
              <Check className="size-4 text-ads-ink" />
            </div>
            <p className="mt-3 text-sm font-medium text-ads-ink">На сегодня чисто</p>
            <p className="mt-1 text-xs text-ads-muted">
              {nextDueLabel ? `Следующая смена ${nextDueLabel}.` : "Возьмите машину с сайта — она попадёт на съёмку."}
            </p>
            <PrimaryBtn className="mt-4" onClick={onOpenWarehouse}>
              <Plus className="size-3.5" />
              Взять с сайта
            </PrimaryBtn>
          </div>
        ) : (
          <div className="pb-1">
            {overdue.length > 0 && (
              <Group title={`Просрочено · ${overdue.length}`}>
                {overdue.map((car) => (
                  <TaskRow
                    key={car.id}
                    car={car}
                    busy={busy(car, busyIds)}
                    hint="Срок смены уже прошёл"
                    primary={{ label: rotateLabel(car.campaign), onSelect: () => onRotate(car, otherAir(car.campaign)) }}
                  />
                ))}
              </Group>
            )}
            {dueToday.length > 0 && (
              <Group title={`Сменить кампанию · ${dueToday.length}`}>
                {dueToday.map((car) => (
                  <TaskRow
                    key={car.id}
                    car={car}
                    busy={busy(car, busyIds)}
                    hint="Сегодня переложить в другую кампанию"
                    primary={{ label: rotateLabel(car.campaign), onSelect: () => onRotate(car, otherAir(car.campaign)) }}
                  />
                ))}
              </Group>
            )}
            {waiting.length > 0 && (
              <Group title={`Снять ролик · ${waiting.length}`}>
                {waiting.slice(0, 8).map((car) => (
                  <TaskRow
                    key={car.id}
                    car={car}
                    busy={busy(car, busyIds)}
                    hint="Ролика ещё нет"
                    primary={{ label: "Отснято", onSelect: () => onMarkShot(car) }}
                  />
                ))}
                {waiting.length > 8 ? (
                  <button type="button" onClick={onOpenShoot} className="w-full px-5 py-2 text-left text-xs font-medium text-ads-muted hover:text-ads-ink">
                    Ещё {waiting.length - 8} на съёмку
                  </button>
                ) : null}
              </Group>
            )}
            {todayDebts.length > 0 && (
              <Group title={`Доп. ролик · ${todayDebts.length}`}>
                {todayDebts.map((debt) => (
                  <div key={debt.id} className="flex items-center gap-3 px-4 py-3">
                    <CatalogLink carId={debt.carId} className="flex min-w-0 flex-1 items-center gap-3">
                      <CarThumb name={debt.name} photoUrl={debt.photoUrl} className="h-10 w-14" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ads-ink">{debt.name}</p>
                        <p className="mt-0.5 text-xs text-ads-muted">Напоминание · на даты эфира не влияет</p>
                      </div>
                    </CatalogLink>
                    <button
                      type="button"
                      onClick={() => onClearDebt(debt.id)}
                      className="inline-flex h-9 items-center rounded-lg bg-ads-ink px-2.5 text-xs font-medium text-ads-paper"
                    >
                      Ролик готов
                    </button>
                  </div>
                ))}
              </Group>
            )}
          </div>
        )}

        {ready.length > 0 && (
          <div className="mx-4 mb-3 overflow-hidden rounded-2xl bg-ads-bg">
            <div className="px-3.5 pt-3 pb-1">
              <p className="text-sm font-medium text-ads-ink">Отснято · {ready.length}</p>
              <p className="mt-0.5 text-xs text-ads-muted">Ролик есть. Поставьте в кампанию.</p>
            </div>
            <div className="divide-y divide-ads-line/70">
              {ready.map((car) => (
                <ReadyRow
                  key={car.id}
                  car={car}
                  busy={busy(car, busyIds)}
                  onK1={() => onAir(car, "rk1")}
                  onK2={() => onAir(car, "rk2")}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 px-4 pb-5">
          <Stat label="На съёмку" value={waiting.length} onClick={onOpenShoot} />
          <Stat label="Отснято" value={ready.length} onClick={onOpenShoot} />
          <Stat label="В эфире" value={airCount} onClick={onOpenAir} />
          <Stat label="Лимит в день" value={settings.targetCarsPerDay || 3} onClick={onOpenAir} />
        </div>
      </AdsScroller>
    </div>
  );
}

function Stat({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-ads-bg px-3 py-2.5 text-left transition-colors hover:bg-ads-surface"
    >
      <p className="font-mono text-lg font-semibold tabular-nums text-ads-ink">{value}</p>
      <p className="text-[11px] text-ads-muted">{label}</p>
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-2">
      <h3 className="px-5 pb-1 text-xs font-medium text-ads-subtle">{title}</h3>
      <div className="divide-y divide-ads-line/80">{children}</div>
    </section>
  );
}

function TaskRow({
  car,
  busy,
  hint,
  primary,
}: {
  car: AdCar;
  busy: boolean;
  hint: string;
  primary: { label: string; onSelect: () => void };
}) {
  return (
    <article className={cn("ads-card-in relative px-4 py-3", busy && "opacity-60")}>
      <div className="flex items-start gap-3">
        <CatalogLink carId={car.carId} className="flex min-w-0 flex-1 items-start gap-3">
          <CarThumb name={car.name} photoUrl={car.photoUrl} className="h-10 w-14" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-medium tracking-tight text-ads-ink">{car.name}</h3>
              <CampaignBadge campaign={car.campaign} sold={car.sold} />
            </div>
            <p className="mt-0.5 truncate text-xs text-ads-muted">
              {[carFacts(car), hint].filter(Boolean).join(" · ")}
            </p>
          </div>
        </CatalogLink>
        <button
          type="button"
          disabled={busy}
          onClick={primary.onSelect}
          className="inline-flex h-9 shrink-0 items-center rounded-lg bg-ads-ink px-2.5 text-xs font-medium text-ads-paper shadow-ads-pill transition-transform duration-150 hover:bg-ads-rail active:scale-[0.97] disabled:opacity-40"
        >
          {busy ? <Spinner /> : primary.label}
        </button>
      </div>
    </article>
  );
}

function ReadyRow({
  car,
  busy,
  onK1,
  onK2,
}: {
  car: AdCar;
  busy: boolean;
  onK1: () => void;
  onK2: () => void;
}) {
  const tier = car.priceTier || calculatePriceTier(car.priceUsd);
  const facts = carFacts(car);
  return (
    <article className={cn("px-3 py-2.5", busy && "opacity-60")}>
      <div className="flex items-start gap-3">
        <CatalogLink carId={car.carId} className="flex min-w-0 flex-1 items-start gap-3">
          <CarThumb name={car.name} photoUrl={car.photoUrl} className="h-12 w-[4.25rem]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium tracking-tight text-ads-ink">{car.name}</p>
            <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-ads-muted">
              <span className="inline-flex h-[18px] shrink-0 items-center rounded-md bg-ads-surface px-1.5 text-[11px] font-medium text-ads-ink">
                {getPriceTierShort(tier)}
              </span>
              {facts ? <span className="truncate font-mono tabular-nums">{facts}</span> : null}
            </p>
            {car.shotByName ? (
              <p className="mt-0.5 truncate text-[11px] text-ads-subtle">Снял {car.shotByName}</p>
            ) : null}
          </div>
        </CatalogLink>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={onK1}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-ads-ink px-2.5 text-xs font-medium text-ads-paper disabled:opacity-40"
          >
            {busy ? <Spinner /> : "В К1"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onK2}
            className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-xs font-medium text-ads-ink ring-1 ring-ads-line-strong disabled:opacity-40"
          >
            В К2
          </button>
        </div>
      </div>
    </article>
  );
}

function isAir(c: AdCar) {
  return c.campaign === "rk1" || c.campaign === "rk2";
}
function daysLeft(c: AdCar) {
  return getCalendarDaysLeft(c.targetRotationDate, c.startedAt, c.maxDays);
}
function busy(car: AdCar, ids: Set<string>) {
  return !!car.id && ids.has(car.id);
}
