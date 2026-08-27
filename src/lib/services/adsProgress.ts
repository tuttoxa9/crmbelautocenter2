import { AdCar, AdsSettings } from "../types";
import { calculateDaysInAd, getCalendarDaysLeft, getMinskDateKey } from "./adsService";

export type BurnTone = "ok" | "mid" | "warn" | "critical" | "overdue" | "queue";

export interface AdBurn {
  kind: "rotation" | "queue";
  percent: number;
  daysIn: number;
  daysLeft: number | null;
  limitDays: number;
  tone: BurnTone;
  label: string;
  sublabel: string;
  rotationDateLabel: string | null;
}

export function getLimitDays(car: AdCar, settings: AdsSettings): number {
  if (car.maxDays && Number(car.maxDays) > 0) return Number(car.maxDays);
  if (car.campaign === "rk1") return Number(settings.rk1Days) || 17;
  if (car.campaign === "rk2") return Number(settings.rk2Days) || 14;
  return 0;
}

export function getAdBurn(car: AdCar, settings: AdsSettings): AdBurn {
  const daysIn = calculateDaysInAd(car.startedAt);

  if (car.campaign === "waiting_video" || car.campaign === "ready_for_ads") {
    return {
      kind: "queue",
      percent: 0,
      daysIn,
      daysLeft: null,
      limitDays: 0,
      tone: "queue",
      label: car.campaign === "waiting_video" ? "Ожидает съёмки" : "Готово к запуску",
      sublabel:
        car.campaign === "waiting_video"
          ? "Таймер ротации не идёт"
          : "Можно ставить в эфир",
      rotationDateLabel: null,
    };
  }

  const daysLeft = getCalendarDaysLeft(
    car.targetRotationDate,
    car.startedAt,
    car.maxDays
  );
  const limitDays = Math.max(1, getLimitDays(car, settings));
  const overdue = daysLeft < 0;
  const consumed = overdue ? 1 : Math.min(1, daysIn / limitDays);
  const percent = Math.min(100, Math.max(overdue ? 100 : 2, consumed * 100));

  let tone: BurnTone = "ok";
  if (overdue) tone = "overdue";
  else if (daysLeft <= 0) tone = "critical";
  else if (daysLeft <= 1) tone = "critical";
  else if (daysLeft <= 3) tone = "warn";
  else if (daysLeft <= 7) tone = "mid";

  let rotationDateLabel: string | null = null;
  if (car.targetRotationDate) {
    try {
      rotationDateLabel = new Date(car.targetRotationDate).toLocaleDateString("ru-RU", {
        timeZone: "Europe/Minsk",
        day: "numeric",
        month: "short",
      });
    } catch {
      rotationDateLabel = getMinskDateKey(car.targetRotationDate);
    }
  }

  return {
    kind: "rotation",
    percent,
    daysIn,
    daysLeft,
    limitDays,
    tone,
    label: overdue
      ? `Просрочено ${Math.abs(daysLeft)} дн.`
      : daysLeft === 0
        ? "Ротация сегодня"
        : `Осталось ${daysLeft} дн.`,
    sublabel: `${daysIn} из ${limitDays} дн. в эфире`,
    rotationDateLabel,
  };
}

export const TONE_BAR: Record<BurnTone, string> = {
  ok: "bg-zinc-800",
  mid: "bg-zinc-700",
  warn: "bg-amber-500",
  critical: "bg-rose-500",
  overdue: "bg-rose-600",
  queue: "bg-zinc-300",
};

export const TONE_TRACK: Record<BurnTone, string> = {
  ok: "bg-zinc-100",
  mid: "bg-zinc-100",
  warn: "bg-amber-100",
  critical: "bg-rose-100",
  overdue: "bg-rose-100",
  queue: "bg-zinc-100",
};

export const TONE_TEXT: Record<BurnTone, string> = {
  ok: "text-zinc-700",
  mid: "text-zinc-800",
  warn: "text-amber-800",
  critical: "text-rose-700",
  overdue: "text-rose-700",
  queue: "text-zinc-500",
};
