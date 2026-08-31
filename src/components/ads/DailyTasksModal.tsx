"use client";

import { type AdCampaignType, type AdCar, type TikTokDebt } from "@/lib/types";
import { MONTHS_LONG } from "@/lib/services/adsService";
import { AdsScroller, CloseBtn, GhostBtn, Overlay, Spinner } from "./chrome";
import { CarThumb } from "./CarThumb";

export function DailyTasksModal({
  isOpen,
  onClose,
  date,
  offset,
  cars,
  debts = [],
  busyIds,
  onRotate,
  onPostponeCar,
  onPostponeDay,
  onRemoveDebt,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  offset: number;
  cars: AdCar[];
  debts?: TikTokDebt[];
  busyIds?: Set<string>;
  onRotate?: (car: AdCar, campaign: AdCampaignType) => void;
  onPostponeCar?: (car: AdCar) => void;
  onPostponeDay?: () => void;
  onRemoveDebt?: (id: string) => void;
}) {
  const rk1Cars = cars.filter((c) => c.campaign === "rk1");
  const rk2Cars = cars.filter((c) => c.campaign === "rk2");
  const dateLabel = `${date.getDate()} ${MONTHS_LONG[date.getMonth()]}`;
  const title =
    offset < 0
      ? dateLabel
      : offset === 0
        ? "Сегодня"
        : offset === 1
          ? "Завтра"
          : dateLabel;

  return (
    <Overlay open={isOpen} onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="ads-enter relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-ads-bg shadow-ads-float sm:rounded-3xl"
      >
        <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-ads-ink">{title}</h2>
            <p className="text-xs text-ads-muted">
              {cars.length ? `${cars.length} в ротации` : "Ротации нет"}
              {debts.length ? ` · долг ${debts.length}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {cars.length > 0 && onPostponeDay ? (
              <GhostBtn className="h-8 px-2.5 text-xs" onClick={onPostponeDay}>
                Отложить день
              </GhostBtn>
            ) : null}
            <CloseBtn onClick={onClose} />
          </div>
        </header>
        <AdsScroller className="min-h-0 flex-1" viewportClassName="space-y-4 px-5 pb-6">
          {cars.length === 0 && debts.length === 0 ? (
            <p className="py-10 text-center text-sm text-ads-subtle">На этот день задач нет</p>
          ) : (
            <>
              {debts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-xs font-medium text-ads-warn">Долг TikTok · {debts.length}</h3>
                    <span className="text-[10px] text-ads-subtle">напоминание</span>
                  </div>
                  <div className="overflow-hidden rounded-2xl bg-ads-card ring-1 ring-ads-warn/25">
                    {debts.map((debt, i) => (
                      <div
                        key={debt.id}
                        className={`flex items-center gap-3 px-3.5 py-3 ${i > 0 ? "border-t border-ads-line" : ""}`}
                      >
                        <CarThumb name={debt.name} photoUrl={debt.photoUrl} className="h-9 w-12" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-ads-ink">{debt.name}</div>
                          <div className="mt-0.5 text-xs text-ads-muted">
                            {debt.year ? `${debt.year} · ` : ""}
                            {debt.priceUsd != null ? `$${Number(debt.priceUsd).toLocaleString("ru-RU")}` : "доп. видео"}
                          </div>
                        </div>
                        {onRemoveDebt ? (
                          <button
                            type="button"
                            onClick={() => onRemoveDebt(debt.id)}
                            className="inline-flex h-8 items-center rounded-lg px-2 text-xs font-medium text-ads-muted hover:bg-ads-surface hover:text-ads-ink"
                          >
                            Снять
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {rk1Cars.length > 0 && (
                <Group
                  title={`Из РК 1 · ${rk1Cars.length}`}
                  cars={rk1Cars}
                  busyIds={busyIds}
                  onRotate={onRotate}
                  onPostpone={onPostponeCar}
                />
              )}
              {rk2Cars.length > 0 && (
                <Group
                  title={`Из РК 2 · ${rk2Cars.length}`}
                  cars={rk2Cars}
                  busyIds={busyIds}
                  onRotate={onRotate}
                  onPostpone={onPostponeCar}
                />
              )}
            </>
          )}
        </AdsScroller>
      </div>
    </Overlay>
  );
}

function Group({
  title,
  cars,
  busyIds,
  onRotate,
  onPostpone,
}: {
  title: string;
  cars: AdCar[];
  busyIds?: Set<string>;
  onRotate?: (car: AdCar, campaign: AdCampaignType) => void;
  onPostpone?: (car: AdCar) => void;
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
              <div className="flex shrink-0 items-center gap-1">
                {onPostpone && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onPostpone(car)}
                    className="inline-flex h-8 items-center rounded-lg px-2 text-xs font-medium text-ads-muted hover:bg-ads-surface hover:text-ads-ink disabled:opacity-40"
                  >
                    Отложить
                  </button>
                )}
                {onRotate && (
                  <>
                    <RotateBtn busy={busy} onClick={() => onRotate(car, "rk1")}>
                      РК 1
                    </RotateBtn>
                    <RotateBtn busy={busy} onClick={() => onRotate(car, "rk2")}>
                      РК 2
                    </RotateBtn>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RotateBtn({
  busy,
  onClick,
  children,
}: {
  busy?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-ads-ink px-2.5 text-xs font-medium text-ads-paper hover:bg-ads-rail disabled:opacity-40"
    >
      {busy ? <Spinner /> : children}
    </button>
  );
}