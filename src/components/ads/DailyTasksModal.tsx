"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { type AdCampaignType, type AdCar } from "@/lib/types";
import { MONTHS_LONG } from "@/lib/services/adsService";
import { CloseBtn, Overlay, Spinner } from "./chrome";

export function DailyTasksModal({
  isOpen,
  onClose,
  date,
  offset,
  cars,
  busyIds,
  onRotate,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  offset: number;
  cars: AdCar[];
  busyIds?: Set<string>;
  onRotate?: (car: AdCar, campaign: AdCampaignType) => void;
}) {
  const rk1Cars = cars.filter((c) => c.campaign === "rk1");
  const rk2Cars = cars.filter((c) => c.campaign === "rk2");
  const title =
    offset < 0
      ? "Просрочено"
      : offset === 0
        ? "Сегодня"
        : offset === 1
          ? "Завтра"
          : `${date.getDate()} ${MONTHS_LONG[date.getMonth()]}`;

  return (
    <Overlay open={isOpen} onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="ads-enter relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-ads-bg shadow-ads-float sm:rounded-3xl"
      >
        <header className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ads-ink">{title}</h2>
            <p className="text-xs text-ads-muted">{cars.length} авто</p>
          </div>
          <CloseBtn onClick={onClose} />
        </header>
        <div className="space-y-4 overflow-y-auto px-5 pb-6">
          {cars.length === 0 ? (
            <p className="py-10 text-center text-sm text-ads-subtle">На этот день задач нет</p>
          ) : (
            <>
              {rk1Cars.length > 0 && (
                <Group title={`Из РК 1 · ${rk1Cars.length}`} cars={rk1Cars} next="rk2" busyIds={busyIds} onRotate={onRotate} />
              )}
              {rk2Cars.length > 0 && (
                <Group title={`Из РК 2 · ${rk2Cars.length}`} cars={rk2Cars} next="rk1" busyIds={busyIds} onRotate={onRotate} />
              )}
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}

function Group({
  title,
  cars,
  next,
  busyIds,
  onRotate,
}: {
  title: string;
  cars: AdCar[];
  next: AdCampaignType;
  busyIds?: Set<string>;
  onRotate?: (car: AdCar, campaign: AdCampaignType) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-ads-subtle">{title}</h3>
      <div className="overflow-hidden rounded-2xl bg-ads-card">
        {cars.map((car, i) => {
          const busy = !!car.id && busyIds?.has(car.id);
          return (
            <div
              key={car.id}
              className={`flex items-center justify-between gap-3 px-3.5 py-3 ${i > 0 ? "border-t border-ads-line" : ""}`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ads-ink">{car.name}</div>
                <div className="mt-0.5 text-xs text-ads-muted">
                  ${Number(car.priceUsd).toLocaleString("ru-RU")}
                </div>
              </div>
              {onRotate && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRotate(car, next)}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-ads-ink px-2.5 text-xs font-medium text-ads-paper disabled:opacity-40"
                >
                  {busy ? (
                    <Spinner />
                  ) : next === "rk2" ? (
                    <ArrowRight className="size-3.5" />
                  ) : (
                    <ArrowLeft className="size-3.5" />
                  )}
                  {next === "rk2" ? "В РК 2" : "В РК 1"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
