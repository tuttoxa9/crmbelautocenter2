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
  shootCap: number;
  off: boolean;
};

export type PersonWeek = {
  reelsPerWeek: number;
  postsPerWeek: number;
  days: Record<string, DayPlan>;
};

export type QualityWeek = {
  weekStart: string;
  people: Record<string, PersonWeek>;
};

export const DEFAULT_DAY: DayPlan = { stories: 5, shootCap: 3, off: false };
export const DEFAULT_WEEK_REELS = 3;
export const DEFAULT_WEEK_POSTS = 0;

export function emptyDay(off = false): DayPlan {
  return off ? { stories: 0, shootCap: 0, off: true } : { ...DEFAULT_DAY };
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
