export type CrmRole = "admin" | "commission" | "smm";
export type SmmLane = "rk1" | "rk2" | "both" | "none";
export type OrganicKind = "stories" | "reels" | "posts";

export type CrmPerson = {
  uid: string;
  email: string;
  name: string;
  role: CrmRole;
  marker: string;
  lane: SmmLane;
  active: boolean;
  createdAt: number;
};

export type DayPlan = {
  stories: number;
  reels: number;
  posts: number;
  shootCap: number;
  off: boolean;
  note: string;
};

export type PersonWeek = {
  days: Record<string, DayPlan>;
};

export type QualityWeek = {
  weekStart: string;
  people: Record<string, PersonWeek>;
};

export type QualityTask = {
  id: string;
  uid: string;
  dateKey: string;
  title: string;
  done: boolean;
  createdAt: number;
};

export type IgMedia = {
  id: string;
  mediaType: string;
  caption: string;
  permalink: string;
  thumbnail: string;
  timestamp: string;
  dateKey: string;
  source: "feed" | "stories";
  ownerUid: string | null;
  credited: boolean;
};

export function defaultDay(weekdayIndex: number): DayPlan {
  if (weekdayIndex === 6) {
    return { stories: 0, reels: 0, posts: 0, shootCap: 0, off: true, note: "" };
  }
  return {
    stories: 5,
    reels: weekdayIndex === 0 || weekdayIndex === 2 || weekdayIndex === 4 ? 1 : 0,
    posts: 0,
    shootCap: 3,
    off: false,
    note: "",
  };
}

export function emptyDay(off = false): DayPlan {
  return off
    ? { stories: 0, reels: 0, posts: 0, shootCap: 0, off: true, note: "" }
    : defaultDay(0);
}

export function laneLabel(lane: SmmLane) {
  if (lane === "rk1") return "РК 1";
  if (lane === "rk2") return "РК 2";
  if (lane === "both") return "Обе РК";
  return "Без съёмки";
}

export function normalizeMarker(raw: string) {
  return raw.replace(/^[#/]+/, "").trim().toLowerCase();
}

export function markersInCaption(caption: string): string[] {
  const found: string[] = [];
  const re = /(?:^|[\s(])(?:\/\/|#)([a-z0-9]{1,8})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(caption || ""))) {
    const v = m[1].toLowerCase();
    if (!found.includes(v)) found.push(v);
  }
  return found;
}

export function weekTotals(plan: PersonWeek | undefined, keys: string[]) {
  const t = { stories: 0, reels: 0, posts: 0, shootCap: 0 };
  if (!plan) return t;
  for (const k of keys) {
    const d = plan.days[k];
    if (!d || d.off) continue;
    t.stories += d.stories;
    t.reels += d.reels;
    t.posts += d.posts;
    t.shootCap += d.shootCap;
  }
  return t;
}
