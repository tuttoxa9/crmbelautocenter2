import { addDaysToDateKey, getMinskDateKey } from "@/lib/services/adsService";

export function qualityTodayKey() {
  return getMinskDateKey(Date.now());
}

export function mondayKey(todayKey = qualityTodayKey()) {
  const [y, m, d] = todayKey.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d, 12);
  const wd = new Date(utc).getUTCDay();
  const offset = wd === 0 ? -6 : 1 - wd;
  return addDaysToDateKey(todayKey, offset);
}

export function weekKeys(weekStart: string) {
  return Array.from({ length: 7 }, (_, i) => addDaysToDateKey(weekStart, i));
}

export const WEEKDAY_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
