import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { adminDb } from "@/lib/firebaseAdmin";
import { getMinskDateKey } from "@/lib/services/adsService";
import { isActorError, requireQualityActor } from "@/lib/quality/auth";
import { mondayKey, qualityTodayKey, weekKeys } from "@/lib/quality/dates";
import {
  DEFAULT_WEEK_POSTS,
  DEFAULT_WEEK_REELS,
  emptyDay,
  type CrmPerson,
  type OrganicKind,
  type PersonWeek,
  type SmmLane,
} from "@/lib/quality/types";

function parseCar(row: any) {
  let d = row.data;
  if (typeof d === "string") {
    try {
      d = JSON.parse(d);
    } catch {
      d = {};
    }
  }
  return { id: row.id, ...d };
}

export async function GET(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  if (actor.role === "commission") {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }

  const todayKey = qualityTodayKey();
  const weekStart = mondayKey(todayKey);
  const keys = weekKeys(weekStart);

  const usersSnap = await adminDb.collection("users").where("role", "==", "smm").get();
  let people: CrmPerson[] = usersSnap.docs.map((doc) => {
    const d = doc.data() || {};
    return {
      uid: doc.id,
      email: d.email || "",
      name: d.name || "",
      role: "smm" as const,
      marker: d.marker || "",
      lane: (d.lane || "none") as SmmLane,
      active: d.active !== false,
      createdAt: d.createdAt || 0,
    };
  }).filter((p) => p.active);
  if (actor.role === "smm") people = people.filter((p) => p.uid === actor.uid);

  const weekSnap = await adminDb.collection("quality_weeks").doc(weekStart).get();
  const rawWeek = weekSnap.data() || {};
  const weekPeople: Record<string, PersonWeek> = {};
  for (const p of people) {
    const src = rawWeek.people?.[p.uid] || {};
    const days: PersonWeek["days"] = {};
    keys.forEach((k, i) => {
      const cell = src.days?.[k];
      days[k] = cell
        ? {
            stories: Math.max(0, Number(cell.stories) || 0),
            shootCap: Math.max(0, Number(cell.shootCap) || 0),
            off: Boolean(cell.off),
          }
        : emptyDay(i === 6);
    });
    weekPeople[p.uid] = {
      reelsPerWeek: Math.max(0, Number(src.reelsPerWeek ?? DEFAULT_WEEK_REELS)),
      postsPerWeek: Math.max(0, Number(src.postsPerWeek ?? DEFAULT_WEEK_POSTS)),
      days,
    };
  }

  const organicSnap = await adminDb
    .collection("quality_counts")
    .where("dateKey", ">=", weekStart)
    .where("dateKey", "<=", keys[6])
    .get();
  const organic: Record<string, Record<string, Record<OrganicKind, number>>> = {};
  organicSnap.docs.forEach((doc) => {
    const d = doc.data();
    const uid = d.uid as string;
    const dateKey = d.dateKey as string;
    if (!organic[uid]) organic[uid] = {};
    organic[uid][dateKey] = {
      stories: Number(d.stories) || 0,
      reels: Number(d.reels) || 0,
      posts: Number(d.posts) || 0,
    };
  });

  const carRows = await sql`SELECT id, data FROM ad_cars`;
  const cars = carRows.map(parseCar);
  const waiting = cars.filter((c) => c.campaign === "waiting_video");
  const ready = cars.filter((c) => c.campaign === "ready_for_ads");
  const shotsToday = cars.filter((c) => {
    if (!c.shotAt || !c.shotBy) return false;
    return getMinskDateKey(c.shotAt) === todayKey;
  });

  const team = people.map((p) => {
    const plan = weekPeople[p.uid];
    const todayPlan = plan?.days?.[todayKey] || emptyDay();
    const todayOrg = organic[p.uid]?.[todayKey] || { stories: 0, reels: 0, posts: 0 };
    const weekOrg = { stories: 0, reels: 0, posts: 0 };
    for (const k of keys) {
      const o = organic[p.uid]?.[k];
      if (!o) continue;
      weekOrg.stories += o.stories;
      weekOrg.reels += o.reels;
      weekOrg.posts += o.posts;
    }
    const myWaiting = waiting.filter((c) => {
      if (!c.plannedCampaign) return false;
      if (p.lane === "both") return true;
      return c.plannedCampaign === p.lane;
    });
    const myShots = shotsToday.filter((c) => c.shotBy === p.uid);
    const shootNorm = todayPlan.off ? 0 : Math.min(todayPlan.shootCap, Math.max(myWaiting.length + myShots.length, 0) || todayPlan.shootCap);
    const queueNorm = todayPlan.off ? 0 : Math.min(todayPlan.shootCap, myWaiting.length + myShots.length);
    return {
      person: p,
      off: todayPlan.off,
      stories: { fact: todayOrg.stories, norm: todayPlan.off ? 0 : todayPlan.stories },
      reels: { fact: weekOrg.reels, norm: plan?.reelsPerWeek || 0 },
      posts: { fact: weekOrg.posts, norm: plan?.postsPerWeek || 0 },
      shoot: { fact: myShots.length, norm: queueNorm || (todayPlan.off ? 0 : 0), cap: todayPlan.shootCap, waiting: myWaiting.length },
      shootNorm,
      waiting: myWaiting,
      shots: myShots,
    };
  });

  const unplanned = waiting.filter((c) => !c.plannedCampaign);

  return NextResponse.json({
    success: true,
    todayKey,
    weekStart,
    weekKeys: keys,
    weekPeople,
    people,
    team,
    waiting,
    ready,
    unplanned,
    organic,
    me: actor.person,
    role: actor.role,
  });
}
