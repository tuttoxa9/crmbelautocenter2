"use client";

import { type AdCar, type AdsSettings, type TikTokDebt } from "@/lib/types";
import { RotationTimeline } from "./RotationTimeline";
import { AdsScroller, CloseBtn, GhostBtn, Spinner } from "./chrome";

export function SchedulePane({
  cars,
  settings,
  balancing,
  onEqualize,
  onVacation,
  onDayClick,
  onClose,
}: {
  cars: AdCar[];
  settings: AdsSettings;
  balancing: boolean;
  onEqualize: () => void;
  onVacation: () => void;
  onDayClick: (offset: number, date: Date, dayCars: AdCar[], dayDebts?: TikTokDebt[]) => void;
  onClose?: () => void;
}) {
  const perDay = settings.targetCarsPerDay || 3;
  return (
    <div
      className={
        onClose
          ? "ads-pane flex max-h-[92vh] min-h-0 flex-col overflow-hidden"
          : "ads-pane flex min-h-0 flex-col max-lg:overflow-visible lg:h-full lg:overflow-hidden"
      }
    >
      <div className="flex items-end justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <p className="text-xs font-medium text-ads-subtle">График</p>
          <h2 className="mt-0.5 text-xl leading-tight font-semibold tracking-tight text-ads-ink">Смены на дни</h2>
          <p className="mt-1 text-sm text-ads-muted">Не больше {perDay} машин в день. Жёлтая точка — доп. ролик.</p>
        </div>
        <div className="flex items-center gap-1">
          <GhostBtn className="h-8 px-2.5 text-xs" onClick={onVacation} disabled={balancing}>
            Пауза
          </GhostBtn>
          <GhostBtn className="h-8 px-2.5 text-xs" onClick={onEqualize} disabled={balancing}>
            {balancing ? <Spinner /> : null}
            {balancing ? "Считаю" : "Выровнять К1 / К2"}
          </GhostBtn>
          {onClose ? <CloseBtn onClick={onClose} /> : null}
        </div>
      </div>
      <AdsScroller nested className="min-h-0 flex-1">
        <div className="px-4 pb-6">
          <RotationTimeline cars={cars} settings={settings} debts={settings.tiktokDebts} days={14} onDayClick={onDayClick} />
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-ads-subtle">
            К1 и К2 — две рекламы TikTok. Выровнять не меняет кампанию сегодня: только даты следующих смен.
          </p>
        </div>
      </AdsScroller>
    </div>
  );
}
