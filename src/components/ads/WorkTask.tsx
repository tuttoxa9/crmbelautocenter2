"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { type AdCampaignType, type AdCar, type AdsSettings } from "@/lib/types";
import { getPrimaryMove } from "@/lib/services/adsService";
import { getAdBurn } from "@/lib/services/adsProgress";
import { CarThumb } from "./CarThumb";
import { BusyOverlay, BurnMeter } from "./chrome";

export function WorkTask({
  car,
  settings,
  busy,
  onSwitch,
}: {
  car: AdCar;
  settings: AdsSettings;
  busy?: boolean;
  onSwitch: (car: AdCar, campaign: AdCampaignType) => void;
}) {
  const burn = getAdBurn(car, settings);
  const move = getPrimaryMove(car.campaign);

  return (
    <article className="relative px-4 py-3">
      <BusyOverlay show={busy} />
      <div className="flex items-start gap-3">
        <CarThumb name={car.name} photoUrl={car.photoUrl} className="h-10 w-14" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-medium tracking-tight text-ads-ink">{car.name}</h3>
            <span className="shrink-0 font-mono text-xs font-medium tabular-nums text-ads-muted">
              ${Number(car.priceUsd).toLocaleString("ru-RU")}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ads-subtle">
            {car.campaign === "rk1" ? "РК 1" : "РК 2"}
            {car.year ? ` · ${car.year}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSwitch(car, move.target)}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-ads-ink px-2.5 text-xs font-medium text-ads-paper shadow-ads-pill transition-transform duration-150 hover:bg-ads-rail active:scale-[0.97]"
        >
          {move.target === "rk2" ? <ArrowRight className="size-3.5" /> : <ArrowLeft className="size-3.5" />}
          {move.label}
        </button>
      </div>
      <div className="mt-2">
        <BurnMeter label={burn.label} sublabel={burn.sublabel} percent={burn.percent} tone={burn.tone} />
      </div>
    </article>
  );
}
