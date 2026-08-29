import { defaultDay, type DayPlan, type PersonWeek, type QualityWeek } from "./types";
import { weekKeys } from "./dates";

export function hydrateDay(cell: any, weekdayIndex: number): DayPlan {
  if (!cell) return defaultDay(weekdayIndex);
  return {
    stories: Math.max(0, Number(cell.stories) || 0),
    reels: Math.max(0, Number(cell.reels) || 0),
    posts: Math.max(0, Number(cell.posts) || 0),
    shootCap: Math.max(0, Number(cell.shootCap) || 0),
    off: Boolean(cell.off),
    note: String(cell.note || ""),
  };
}

export function hydratePersonWeek(src: any, keys: string[]): PersonWeek {
  const days: PersonWeek["days"] = {};
  const hasDailyReels = keys.some((k) => src?.days?.[k] && src.days[k].reels != null);
  keys.forEach((k, i) => {
    days[k] = hydrateDay(src?.days?.[k], i);
  });
  if (!hasDailyReels && Number(src?.reelsPerWeek) > 0) {
    let left = Number(src.reelsPerWeek);
    for (const i of [0, 2, 4]) {
      if (left <= 0) break;
      if (days[keys[i]]?.off) continue;
      days[keys[i]] = { ...days[keys[i]], reels: 1 };
      left -= 1;
    }
  }
  return { days };
}

export function fillWeek(raw: any, weekStart: string, uids: string[]): QualityWeek {
  const keys = weekKeys(weekStart);
  const people: Record<string, PersonWeek> = {};
  for (const uid of uids) {
    people[uid] = hydratePersonWeek(raw?.people?.[uid], keys);
  }
  return { weekStart, people };
}

export function remapWeek(from: QualityWeek, toStart: string, uids: string[]): QualityWeek {
  const fromKeys = weekKeys(from.weekStart);
  const toKeys = weekKeys(toStart);
  const people: Record<string, PersonWeek> = {};
  for (const uid of uids) {
    const src = from.people[uid];
    const days: PersonWeek["days"] = {};
    toKeys.forEach((k, i) => {
      days[k] = src?.days?.[fromKeys[i]] ? { ...src.days[fromKeys[i]] } : defaultDay(i);
    });
    people[uid] = { days };
  }
  return { weekStart: toStart, people };
}
