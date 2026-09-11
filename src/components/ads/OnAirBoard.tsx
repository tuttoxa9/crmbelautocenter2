"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { type AdCampaignType, type AdCar, type AdPriceTier, type AdsSettings } from "@/lib/types";
import { TIERS, calculatePriceTier, getCalendarDaysLeft } from "@/lib/services/adsService";
import { matchesCarQuery } from "@/lib/ads/copy";
import { cn } from "@/lib/utils";
import { AdsCarCard } from "./AdsCarCard";
import { AdsScroller } from "./chrome";

export function OnAirBoard({
  cars,
  settings,
  busyIds,
  onSwitch,
  onSaveDays,
  onReset,
  onDelete,
  onPostpone,
  fill = true,
  searchQuery = "",
}: {
  cars: AdCar[];
  settings: AdsSettings;
  busyIds: Set<string>;
  onSwitch: (car: AdCar, campaign: AdCampaignType) => void;
  onSaveDays: (car: AdCar, days: number) => void;
  onReset: (car: AdCar) => void;
  onDelete: (car: AdCar) => void;
  onPostpone?: (car: AdCar) => void;
  fill?: boolean;
  searchQuery?: string;
}) {
  const [tier, setTier] = useState<AdPriceTier | "all">("all");
  const searching = searchQuery.trim().length > 0;

  const air = useMemo(
    () => cars.filter((c) => (c.campaign === "rk1" || c.campaign === "rk2") && !c.sold),
    [cars],
  );

  const filtered = useMemo(() => {
    return air
      .filter((c) => (tier === "all" || searching ? true : (c.priceTier || calculatePriceTier(c.priceUsd)) === tier))
      .filter((c) => matchesCarQuery(c, searchQuery))
      .sort((a, b) => daysLeft(a) - daysLeft(b));
  }, [air, searchQuery, tier, searching]);

  const rk1 = filtered.filter((c) => c.campaign === "rk1");
  const rk2 = filtered.filter((c) => c.campaign === "rk2");
  const mix = TIERS.map((t) => ({
    tier: t,
    count: air.filter((c) => (c.priceTier || calculatePriceTier(c.priceUsd)) === t).length,
  }));
  const mixTotal = Math.max(1, air.length);
  const handlers = { onSwitch, onSaveDays, onReset, onDelete, onPostpone };
  const emptyFilter = searching || tier !== "all";
  const columns = (
    <div
      className={cn(
        "grid grid-cols-1 divide-y divide-ads-line",
        (searching ? Number(rk1.length > 0) + Number(rk2.length > 0) : 2) > 1 &&
          "xl:grid-cols-2 xl:divide-x xl:divide-y-0",
      )}
    >
      {searching && rk1.length === 0 ? null : (
        <Column title="Кампания 1" hint="Первый заход ролика" count={rk1.length}>
          {rk1.length === 0 ? (
            <Empty text={emptyFilter ? "Ничего по запросу" : "Пусто. Поставьте машину из «Отснято»."} />
          ) : (
            rk1.map((car) => (
              <AdsCarCard
                key={car.id}
                car={car}
                settings={settings}
                busy={!!car.id && busyIds.has(car.id)}
                highlight={searching}
                {...handlers}
              />
            ))
          )}
        </Column>
      )}
      {searching && rk2.length === 0 ? null : (
        <Column title="Кампания 2" hint="Второй заход ролика" count={rk2.length}>
          {rk2.length === 0 ? (
            <Empty text={emptyFilter ? "Ничего по запросу" : "Пусто. Поставьте машину из «Отснято»."} />
          ) : (
            rk2.map((car) => (
              <AdsCarCard
                key={car.id}
                car={car}
                settings={settings}
                busy={!!car.id && busyIds.has(car.id)}
                highlight={searching}
                {...handlers}
              />
            ))
          )}
        </Column>
      )}
    </div>
  );

  if (searching && filtered.length === 0) return null;

  return (
    <div
      className={cn(
        "ads-pane flex min-h-0 flex-col",
        fill ? "max-lg:overflow-visible lg:h-full lg:overflow-hidden" : "overflow-visible",
      )}
    >
      <div className="flex items-end justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <p className="text-xs font-medium text-ads-subtle">Эфир</p>
          <h2 className="mt-0.5 text-xl leading-tight font-semibold tracking-tight text-ads-ink">Что крутится</h2>
        </div>
        <span className="font-mono text-sm tabular-nums text-ads-muted">
          {searching ? filtered.length : air.length}
        </span>
      </div>

      {searching ? null : (
        <div className="px-5 pb-3">
          <div className="flex h-1 overflow-hidden rounded-full bg-ads-surface">
            {mix.map((m) =>
              m.count === 0 ? null : (
                <div
                  key={m.tier}
                  className="h-full bg-ads-ink"
                  style={{
                    width: `${(m.count / mixTotal) * 100}%`,
                    opacity: 0.22 + (TIERS.indexOf(m.tier) / Math.max(1, TIERS.length - 1)) * 0.78,
                  }}
                />
              ),
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Chip active={tier === "all"} onClick={() => setTier("all")}>
              Все
            </Chip>
            {mix.filter((m) => m.count > 0).map((m) => (
              <Chip key={m.tier} active={tier === m.tier} onClick={() => setTier(m.tier)}>
                {shortTier(m.tier)}
                <span className="font-mono tabular-nums opacity-70">{m.count}</span>
              </Chip>
            ))}
          </div>
        </div>
      )}

      {fill ? (
        <AdsScroller nested className="min-h-0 flex-1">
          {columns}
        </AdsScroller>
      ) : (
        columns
      )}
    </div>
  );
}

function Column({
  title,
  hint,
  count,
  children,
}: {
  title: string;
  hint: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <header className="flex items-baseline justify-between gap-2 px-5 py-2.5">
        <div>
          <h3 className="text-sm font-medium text-ads-ink">{title}</h3>
          <p className="text-xs text-ads-subtle">{hint}</p>
        </div>
        <span className="font-mono text-sm tabular-nums text-ads-muted">{count}</span>
      </header>
      <div className="divide-y divide-ads-line/80 pb-2">{children}</div>
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
        active ? "bg-ads-ink text-ads-paper shadow-ads-pill" : "bg-ads-bg text-ads-ink hover:bg-ads-surface",
      )}
    >
      {children}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-5 py-10 text-center text-sm text-ads-subtle">{text}</p>;
}

function daysLeft(c: AdCar) {
  return getCalendarDaysLeft(c.targetRotationDate, c.startedAt, c.maxDays);
}

function shortTier(tier: AdPriceTier) {
  switch (tier) {
    case "tier_under_7k":
      return "До $7k";
    case "tier_7k_13k":
      return "$7–13k";
    case "tier_13k_20k":
      return "$13–20k";
    case "tier_20k_plus":
      return "$20k+";
    default:
      return tier;
  }
}