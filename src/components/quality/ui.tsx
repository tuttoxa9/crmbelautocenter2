"use client";

import type { ReactNode } from "react";
import { calculatePriceTier, getPriceTierShort } from "@/lib/services/adsService";
import { cn } from "@/lib/utils";
import { CarThumb } from "@/components/ads/CarThumb";
import type { DayPlan } from "@/lib/quality/types";

export function CarLine({ car, border, children }: { car: any; border?: boolean; children?: ReactNode }) {
  const tier = car.priceTier || calculatePriceTier(car.priceUsd);
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2.5", border && "border-t border-ads-line")}>
      <CarThumb name={car.name} photoUrl={car.photoUrl} className="h-10 w-14" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{car.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ads-muted">
          <span className="rounded-md bg-ads-surface px-1.5 py-0.5 font-medium text-ads-ink">{getPriceTierShort(tier)}</span>
          <span>{car.plannedCampaign === "rk1" ? "РК 1" : car.plannedCampaign === "rk2" ? "РК 2" : "без линии"}</span>
          {car.shotByName ? <span>· {car.shotByName}</span> : null}
        </p>
      </div>
      {children}
    </div>
  );
}

export function LaneChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
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

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ads-muted">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl bg-ads-card px-3 text-sm text-ads-ink outline-none ring-ads-line focus:ring-2 disabled:opacity-60"
      />
    </label>
  );
}

export function Meter({
  label,
  fact,
  norm,
  onMinus,
  onPlus,
  busy,
  hint,
}: {
  label: string;
  fact: number;
  norm: number;
  onMinus?: () => void;
  onPlus?: () => void;
  busy?: boolean;
  hint?: string;
}) {
  const pct = norm <= 0 ? (fact > 0 ? 100 : 0) : Math.min(100, (fact / Math.max(norm, 1)) * 100);
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ads-ink">{label}</p>
          {hint ? <p className="text-[11px] text-ads-subtle">{hint}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {onMinus ? (
            <button type="button" disabled={busy || fact <= 0} onClick={onMinus} className="flex size-8 items-center justify-center rounded-lg bg-ads-surface text-lg disabled:opacity-30">
              −
            </button>
          ) : null}
          <span className="min-w-12 text-center font-mono text-sm tabular-nums">
            {fact}/{norm}
          </span>
          {onPlus ? (
            <button type="button" disabled={busy} onClick={onPlus} className="flex size-8 items-center justify-center rounded-lg bg-ads-surface text-lg disabled:opacity-30">
              +
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ads-surface">
        <div className="h-full bg-ads-ink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StatusDot({ off, ok, bad }: { off?: boolean; ok?: boolean; bad?: boolean }) {
  const tone = off ? "bg-ads-line-strong" : bad ? "bg-ads-danger" : ok ? "bg-ads-ok" : "bg-ads-mid";
  return <span className={cn("size-2.5 shrink-0 rounded-full", tone)} />;
}

export function dayOk(plan: DayPlan, fact: { stories: number; reels: number; posts: number }) {
  if (plan.off) return "off";
  const storiesOk = fact.stories >= plan.stories;
  const reelsOk = fact.reels >= plan.reels;
  const postsOk = fact.posts >= plan.posts;
  if (storiesOk && reelsOk && postsOk) return "ok";
  if (plan.stories > 0 && fact.stories === 0) return "bad";
  return "mid";
}
