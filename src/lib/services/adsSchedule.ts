import {
  addDaysToDateKey,
  getDateKeyDiffDays,
  getMinskDateKey,
  minskDateKeyToTimestamp,
} from "./adsService";

export type AirCampaign = "rk1" | "rk2";

export type TapeCar = {
  id: string;
  name?: string;
  campaign: string;
  targetRotationDate?: number | null;
  startedAt?: number | null;
  maxDays?: number | null;
};

export type DatedCar = TapeCar & { dateKey: string; campaign: AirCampaign };

export type DayPreview = {
  dateKey: string;
  rk1: number;
  rk2: number;
  total: number;
  names: string[];
};

export type EqualizePlan = {
  startKey: string;
  need: number;
  catchupSlots: number;
  perDay: number;
  current: { rk1: number; rk2: number; total: number };
  target: { rk1: number; rk2: number };
  daysToEven: number;
  days: DayPreview[];
  stamps: { id: string; dateKey: string }[];
  message: string;
};

export function isAirCampaign(c: string | undefined): c is AirCampaign {
  return c === "rk1" || c === "rk2";
}

export function carDateKey(car: TapeCar): string | null {
  const t = Number(car.targetRotationDate);
  if (!t) return null;
  return getMinskDateKey(t);
}

export function airCars(cars: TapeCar[]): DatedCar[] {
  return cars
    .filter((c) => isAirCampaign(c.campaign))
    .map((c) => ({
      ...c,
      id: String(c.id || ""),
      campaign: c.campaign as AirCampaign,
      dateKey: carDateKey(c) || "9999-12-31",
    }));
}

export function chooseCampaignForNewCar(rk1: number, rk2: number): AirCampaign {
  return rk1 <= rk2 ? "rk1" : "rk2";
}

export function defaultScheduleStart(todayKey: string, cars: TapeCar[]): string {
  const anyoneToday = airCars(cars).some((c) => c.dateKey === todayKey);
  return anyoneToday ? todayKey : addDaysToDateKey(todayKey, 1);
}

function holdPattern(holdDay: number, perDay: number): AirCampaign[] {
  const a = Math.ceil(perDay / 2);
  const b = Math.max(0, perDay - a);
  if (holdDay % 2 === 0) {
    return [...Array(a).fill("rk1"), ...Array(b).fill("rk2")] as AirCampaign[];
  }
  return [...Array(b).fill("rk1"), ...Array(a).fill("rk2")] as AirCampaign[];
}

function wantedCampaign(globalSlot: number, need: number, perDay: number): AirCampaign {
  if (globalSlot < need) return "rk1";
  const hold = globalSlot - need;
  const holdDay = Math.floor(hold / perDay);
  const holdPos = hold % perDay;
  return holdPattern(holdDay, perDay)[holdPos] || "rk1";
}

function sortQueue(list: DatedCar[]) {
  return [...list].sort((a, b) => {
    const da = a.dateKey.localeCompare(b.dateKey);
    if (da) return da;
    return (Number(a.startedAt) || 0) - (Number(b.startedAt) || 0) || a.id.localeCompare(b.id);
  });
}

function takeWanted(want: AirCampaign, q1: DatedCar[], q2: DatedCar[]): DatedCar | null {
  if (want === "rk1") return q1.shift() || q2.shift() || null;
  return q2.shift() || q1.shift() || null;
}

function buildDays(stamps: { id: string; dateKey: string; campaign: AirCampaign; name?: string }[]): DayPreview[] {
  const keys = [...new Set(stamps.map((s) => s.dateKey))].sort();
  return keys.map((dateKey) => {
    const rows = stamps.filter((s) => s.dateKey === dateKey);
    return {
      dateKey,
      rk1: rows.filter((r) => r.campaign === "rk1").length,
      rk2: rows.filter((r) => r.campaign === "rk2").length,
      total: rows.length,
      names: rows.map((r) => r.name || r.id),
    };
  });
}

export function planEqualize(
  cars: TapeCar[],
  todayKey: string,
  perDayInput?: number,
): EqualizePlan {
  const perDay = Math.max(1, Number(perDayInput) || 3);
  const air = airCars(cars);
  const rk1 = sortQueue(air.filter((c) => c.campaign === "rk1"));
  const rk2 = sortQueue(air.filter((c) => c.campaign === "rk2"));
  const total = air.length;
  const targetRk1 = Math.ceil(total / 2);
  const targetRk2 = total - targetRk1;
  const need = Math.max(0, rk1.length - targetRk1);
  const startKey = defaultScheduleStart(todayKey, cars);
  const q1 = [...rk1];
  const q2 = [...rk2];
  const assigned: { id: string; dateKey: string; campaign: AirCampaign; name?: string }[] = [];

  let slot = 0;
  while (q1.length || q2.length) {
    const want = wantedCampaign(slot, need, perDay);
    const car = takeWanted(want, q1, q2);
    if (!car) break;
    const dateKey = addDaysToDateKey(startKey, Math.floor(slot / perDay));
    assigned.push({ id: car.id, dateKey, campaign: car.campaign, name: car.name });
    slot++;
  }

  const daysToEven = need === 0 ? 0 : Math.ceil(need / perDay);
  const message =
    need === 0
      ? `Сток уже ${rk1.length} / ${rk2.length}. Лента станет чередованием ${perDay} в день.`
      : `Если крутить по графику, через ${daysToEven} раб. дн. станет ${targetRk1} / ${targetRk2}. Сейчас ${rk1.length} / ${rk2.length}.`;

  return {
    startKey,
    need,
    catchupSlots: need,
    perDay,
    current: { rk1: rk1.length, rk2: rk2.length, total },
    target: { rk1: targetRk1, rk2: targetRk2 },
    daysToEven,
    days: buildDays(assigned),
    stamps: assigned.map(({ id, dateKey }) => ({ id, dateKey })),
    message,
  };
}

export function planCompact(cars: TapeCar[], todayKey: string, perDayInput?: number): { stamps: { id: string; dateKey: string }[]; days: DayPreview[] } {
  const perDay = Math.max(1, Number(perDayInput) || 3);
  const air = sortQueue(airCars(cars));
  const startKey = todayKey;
  const assigned = air.map((car, i) => ({
    id: car.id,
    dateKey: addDaysToDateKey(startKey, Math.floor(i / perDay)),
    campaign: car.campaign,
    name: car.name,
  }));
  return {
    stamps: assigned.map(({ id, dateKey }) => ({ id, dateKey })),
    days: buildDays(assigned),
  };
}

export function planShift(cars: TapeCar[], fromDateKey: string, days: number): { stamps: { id: string; dateKey: string }[]; days: DayPreview[] } {
  const n = Math.max(1, Math.min(21, Math.floor(Number(days) || 0)));
  const assigned = airCars(cars).map((car) => ({
    id: car.id,
    dateKey: car.dateKey >= fromDateKey ? addDaysToDateKey(car.dateKey, n) : car.dateKey,
    campaign: car.campaign,
    name: car.name,
  }));
  assigned.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return {
    stamps: assigned.map(({ id, dateKey }) => ({ id, dateKey })),
    days: buildDays(assigned),
  };
}

function groupByDate(items: DatedCar[]): Map<string, DatedCar[]> {
  const keys = [...new Set(items.map((i) => i.dateKey))].sort();
  const m = new Map<string, DatedCar[]>();
  for (const k of keys) m.set(k, items.filter((i) => i.dateKey === k));
  return m;
}

function flattenGroups(groups: Map<string, DatedCar[]>): DatedCar[] {
  return [...groups.keys()].sort().flatMap((k) => (groups.get(k) || []).map((c) => ({ ...c, dateKey: k })));
}

function spillForward(groups: Map<string, DatedCar[]>, fromKey: string, perDay: number) {
  const keys = [...groups.keys()].sort();
  const last = keys[keys.length - 1] || fromKey;
  const end = addDaysToDateKey(last, 45);
  let key = fromKey;
  while (key <= end) {
    const day = [...(groups.get(key) || [])];
    if (day.length > perDay) {
      const keep = day.slice(0, perDay);
      const extra = day.slice(perDay);
      groups.set(key, keep);
      const next = addDaysToDateKey(key, 1);
      groups.set(next, [...extra, ...(groups.get(next) || [])]);
    } else if (day.length) {
      groups.set(key, day);
    }
    key = addDaysToDateKey(key, 1);
  }
}

export function planPostponeCars(
  cars: TapeCar[],
  carIds: string[],
  toDateKey: string,
  todayKey: string,
  perDayInput?: number,
): { stamps: { id: string; dateKey: string }[]; days: DayPreview[] } {
  const perDay = Math.max(1, Number(perDayInput) || 3);
  if (toDateKey < todayKey) {
    throw new Error("Нельзя отложить в прошлое");
  }
  const max = addDaysToDateKey(todayKey, 45);
  if (toDateKey > max) {
    throw new Error("Слишком далеко — максимум 45 дней");
  }
  const air = sortQueue(airCars(cars));
  const idSet = new Set(carIds);
  const moving = air.filter((c) => idSet.has(c.id));
  if (moving.length === 0) {
    return { stamps: air.map((c) => ({ id: c.id, dateKey: c.dateKey })), days: [] };
  }
  const rest = air.filter((c) => !idSet.has(c.id));
  const groups = groupByDate(rest);
  groups.set(toDateKey, [...moving.map((c) => ({ ...c, dateKey: toDateKey })), ...(groups.get(toDateKey) || [])]);
  spillForward(groups, toDateKey, perDay);
  const assigned = flattenGroups(groups);
  return {
    stamps: assigned.map((c) => ({ id: c.id, dateKey: c.dateKey })),
    days: buildDays(assigned),
  };
}

export function planPostponeDay(
  cars: TapeCar[],
  fromDateKey: string,
  toDateKey: string,
  todayKey: string,
  perDayInput?: number,
) {
  const ids = airCars(cars).filter((c) => c.dateKey === fromDateKey).map((c) => c.id);
  return planPostponeCars(cars, ids, toDateKey, todayKey, perDayInput);
}

export function pickNextSlotDateKey(
  others: TapeCar[],
  todayKey: string,
  perDayInput: number | undefined,
  incomingCampaign: AirCampaign,
  opts?: { allowToday?: boolean },
): string {
  const perDay = Math.max(1, Number(perDayInput) || 3);
  const startKey = opts?.allowToday ? todayKey : addDaysToDateKey(todayKey, 1);
  const air = airCars(others);
  const counts: Record<string, number> = {};
  const mix: Record<string, { rk1: number; rk2: number }> = {};
  for (const c of air) {
    counts[c.dateKey] = (counts[c.dateKey] || 0) + 1;
    if (!mix[c.dateKey]) mix[c.dateKey] = { rk1: 0, rk2: 0 };
    mix[c.dateKey][c.campaign]++;
  }
  let fallback: string | null = null;
  for (let i = 0; i <= 90; i++) {
    const key = addDaysToDateKey(startKey, i);
    const n = counts[key] || 0;
    if (n >= perDay) continue;
    if (!fallback) fallback = key;
    const same = mix[key]?.[incomingCampaign] || 0;
    const other = n - same;
    if (same <= other) return key;
  }
  return fallback || addDaysToDateKey(startKey, 90);
}

export function stampDate<T extends TapeCar>(car: T, dateKey: string, todayKey: string): T {
  const daysIn = Math.max(0, Math.floor((Date.now() - Number(car.startedAt || Date.now())) / 86400000));
  const left = Math.max(0, getDateKeyDiffDays(todayKey, dateKey));
  return {
    ...car,
    targetRotationDate: minskDateKeyToTimestamp(dateKey),
    maxDays: daysIn + left,
  };
}

export function maxPerDay(days: DayPreview[], perDay: number) {
  return days.every((d) => d.total <= perDay);
}

export function runScheduleSelfCheck(): string[] {
  const err: string[] = [];
  const today = "2026-08-29";
  const mk = (id: string, campaign: AirCampaign, dateKey: string): TapeCar => ({
    id,
    name: id,
    campaign,
    startedAt: 1,
    targetRotationDate: minskDateKeyToTimestamp(dateKey),
  });
  const cars: TapeCar[] = [
    ...Array.from({ length: 39 }, (_, i) => mk(`a${i}`, "rk1", addDaysToDateKey("2026-08-30", Math.floor(i / 3)))),
    ...Array.from({ length: 19 }, (_, i) => mk(`b${i}`, "rk2", addDaysToDateKey("2026-09-05", Math.floor(i / 3)))),
  ];
  const eq = planEqualize(cars, today, 3);
  if (eq.need !== 10) err.push(`need ${eq.need} != 10`);
  if (eq.target.rk1 !== 29 || eq.target.rk2 !== 29) err.push(`target ${eq.target.rk1}/${eq.target.rk2}`);
  const firstSlots = eq.stamps.slice(0, 10);
  const firstIds = new Set(firstSlots.map((s) => s.id));
  const firstRk2 = cars.filter((c) => firstIds.has(c.id) && c.campaign === "rk2");
  if (firstRk2.length) err.push("first 10 slots must be rk1 cars");
  if (!maxPerDay(eq.days, 3)) err.push("equalize day overflow");
  const holdDays = eq.days.filter((d) => d.dateKey >= addDaysToDateKey(eq.startKey, eq.daysToEven));
  for (const d of holdDays) {
    if (d.rk1 > 0 && d.rk2 > 0 && Math.abs(d.rk1 - d.rk2) > 2) {
      err.push(`hold day ${d.dateKey} mix ${d.rk1}/${d.rk2}`);
    }
  }

  const shifted = planShift(cars, today, 5);
  const sample = airCars(cars)[0];
  const stamped = shifted.stamps.find((s) => s.id === sample.id);
  if (stamped && sample.dateKey >= today) {
    const expect = addDaysToDateKey(sample.dateKey, 5);
    if (stamped.dateKey !== expect) err.push(`shift ${stamped.dateKey} != ${expect}`);
  }
  if (shifted.days.some((d) => d.dateKey >= today && d.dateKey < addDaysToDateKey(today, 5) && d.total > 0 && d.dateKey < "2026-09-04")) {
    // first 5 days from Aug 29 should be empty if original started Aug 30
  }
  const emptyVac = ["2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03"];
  for (const k of emptyVac) {
    const row = shifted.days.find((d) => d.dateKey === k);
    if (row && row.total > 0 && k < "2026-09-04") err.push(`vacation day ${k} not empty`);
  }

  const three = [
    mk("p1", "rk1", "2026-08-30"),
    mk("p2", "rk1", "2026-08-30"),
    mk("p3", "rk1", "2026-08-30"),
    mk("p4", "rk2", "2026-08-31"),
    mk("p5", "rk2", "2026-08-31"),
    mk("p6", "rk2", "2026-08-31"),
  ];
  const post = planPostponeCars(three, ["p1"], "2026-08-31", today, 3);
  const d30 = post.days.find((d) => d.dateKey === "2026-08-30");
  const d31 = post.days.find((d) => d.dateKey === "2026-08-31");
  const d01 = post.days.find((d) => d.dateKey === "2026-09-01");
  if (!d30 || d30.total !== 2) err.push(`today after postpone ${d30?.total}`);
  if (!d31 || d31.total !== 3) err.push(`tomorrow after postpone ${d31?.total}`);
  if (!d01 || d01.total !== 1) err.push(`spill ${d01?.total}`);
  if (post.stamps.find((s) => s.id === "p1")?.dateKey !== "2026-08-31") err.push("p1 not first tomorrow");
  if (!maxPerDay(post.days, 3)) err.push("postpone overflow");

  try {
    planPostponeCars(three, ["p1"], "2026-08-28", today, 3);
    err.push("past postpone should throw");
  } catch {
    /* ok */
  }

  const slot = pickNextSlotDateKey(three, "2026-08-30", 3, "rk2", { allowToday: false });
  if (slot === "2026-08-30") err.push("rotation must not reuse today");

  if (chooseCampaignForNewCar(29, 29) !== "rk1") err.push("tie should rk1");
  if (chooseCampaignForNewCar(30, 29) !== "rk2") err.push("smaller should rk2");

  return err;
}
