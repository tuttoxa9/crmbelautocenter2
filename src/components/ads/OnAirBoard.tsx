"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { type AdCampaignType, type AdCar, type AdPriceTier, type AdsSettings } from "@/lib/types";
import { TIERS, calculatePriceTier, getCalendarDaysLeft } from "@/lib/services/adsService";
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
}: {
  cars: AdCar[];
  settings: AdsSettings;
  busyIds: Set<string>;
  onSwitch: (car: AdCar, campaign: AdCampaignType) => void;
  onSaveDays: (car: AdCar, days: number) => void;
  onReset: (car: AdCar) => void;
  onDelete: (car: AdCar) => void;
}) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<AdPriceTier | "all">("all");

  const air = useMemo(
    () => cars.filter((c) => c.campaign === "rk1" || c.campaign === "rk2"),
    [cars],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return air
      .filter((c) => (tier === "all" ? true : (c.priceTier || calculatePriceTier(c.priceUsd)) === tier))
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          String(c.year || "").includes(q) ||
          String(c.priceUsd).includes(q)
        );
      })
      .sort((a, b) => daysLeft(a) - daysLeft(b));
  }, [air, query, tier]);

  const rk1 = filtered.filter((c) => c.campaign === "rk1");
  const rk2 = filtered.filter((c) => c.campaign === "rk2");
  const mix = TIERS.map((t) => ({
    tier: t,
    count: air.filter((c) => (c.priceTier || calculatePriceTier(c.priceUsd)) === t).length,
  }));
  const mixTotal = Math.max(1, air.length);
  const handlers = { onSwitch, onSaveDays, onReset, onDelete };

  return (
    <div className="ads-pane flex min-h-0 flex-col max-lg:overflow-visible lg:h-full lg:overflow-hidden">
      <div className="flex items-end justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <p className="text-xs font-medium text-ads-subtle">Эфир</p>
          <h2 className="mt-0.5 text-xl leading-tight font-semibold tracking-tight text-ads-ink">Что крутится</h2>
        </div>
        <span className="font-mono text-sm tabular-nums text-ads-muted">{air.length}</span>
      </div>

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
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ads-subtle" />
          <input
            type="text"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти авто"
            className="h-9 w-full rounded-xl border-0 bg-ads-bg pr-9 pl-9 text-sm text-ads-ink outline-none placeholder:text-ads-subtle focus:bg-ads-surface focus:ring-2 focus:ring-ads-accent/25"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center text-ads-subtle"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <AdsScroller nested className="min-h-0 flex-1">
      <div className="grid grid-cols-1 divide-y divide-ads-line xl:grid-cols-2 xl:divide-x xl:divide-y-0">
        <Column title="РК 1" hint="Первый цикл" count={rk1.length}>
          {rk1.length === 0 ? (
            <Empty text={query || tier !== "all" ? "Ничего по фильтру" : "Пусто"} />
          ) : (
            rk1.map((car) => (
              <AdsCarCard
                key={car.id}
                car={car}
                settings={settings}
                busy={!!car.id && busyIds.has(car.id)}
                {...handlers}
              />
            ))
          )}
        </Column>
        <Column title="РК 2" hint="Второй цикл" count={rk2.length}>
          {rk2.length === 0 ? (
            <Empty text={query || tier !== "all" ? "Ничего по фильтру" : "Пусто"} />
          ) : (
            rk2.map((car) => (
              <AdsCarCard
                key={car.id}
                car={car}
                settings={settings}
                busy={!!car.id && busyIds.has(car.id)}
                {...handlers}
              />
            ))
          )}
        </Column>
      </div>
      </AdsScroller>
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
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors",
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
