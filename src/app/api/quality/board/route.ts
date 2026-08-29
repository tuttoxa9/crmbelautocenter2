import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { adminDb } from "@/lib/firebaseAdmin";
import { getMinskDateKey } from "@/lib/services/adsService";
import { isActorError, requireQualityActor } from "@/lib/quality/auth";
import { mondayKey, qualityTodayKey, weekKeys } from "@/lib/quality/dates";
import { defaultDay, weekTotals, type CrmPerson, type OrganicKind, type SmmLane } from "@/lib/quality/types";
import { hydratePersonWeek } from "@/lib/quality/weekFill";

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
  const url = new URL(request.url);
  const weekStart = url.searchParams.get("weekStart") || mondayKey(todayKey);
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
  });
  const peopleAll = [...people];
  people = people.filter((p) => p.active);
  if (actor.role === "smm") people = people.filter((p) => p.uid === actor.uid);

  const weekSnap = await adminDb.collection("quality_weeks").doc(weekStart).get();
  const rawWeek = weekSnap.data() || {};
  const weekPeople: Record<string, ReturnType<typeof hydratePersonWeek>> = {};
  for (const p of people) {
    weekPeople[p.uid] = hydratePersonWeek(rawWeek.people?.[p.uid], keys);
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
  const shotsToday = cars.filter((c) => c.shotAt && c.shotBy && getMinskDateKey(c.shotAt) === todayKey);

  const tasksSnap = await adminDb.collection("quality_tasks").where("dateKey", "==", todayKey).get();
  let tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (actor.role === "smm") tasks = tasks.filter((t: any) => t.uid === actor.uid);

  let unattributed = 0;
  let liveStories: any[] = [];
  try {
    const igSnap = await adminDb.collection("quality_ig_media").where("ownerUid", "==", null).limit(40).get();
    unattributed = igSnap.size;
    liveStories = igSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((m: any) => m.source === "stories" && m.dateKey === todayKey);
  } catch {
    unattributed = 0;
  }

  const settingsSnap = await adminDb.collection("quality_settings").doc("main").get();
  const st = settingsSnap.data() || {};
  const ig = {
    hasToken: Boolean(st.igToken),
    lastPollAt: st.lastPollAt || null,
    lastPollError: st.lastPollError || null,
  };

  const team = people.map((p) => {
    const plan = weekPeople[p.uid];
    const todayPlan = plan?.days?.[todayKey] || defaultDay(keys.indexOf(todayKey));
    const todayOrg = organic[p.uid]?.[todayKey] || { stories: 0, reels: 0, posts: 0 };
    const weekOrg = { stories: 0, reels: 0, posts: 0 };
    for (const k of keys) {
      const o = organic[p.uid]?.[k];
      if (!o) continue;
      weekOrg.stories += o.stories;
      weekOrg.reels += o.reels;
      weekOrg.posts += o.posts;
    }
    const norms = weekTotals(plan, keys);
    const myWaiting = waiting.filter((c) => {
      if (!c.plannedCampaign) return false;
      if (p.lane === "both") return true;
      return c.plannedCampaign === p.lane;
    });
    const myShots = shotsToday.filter((c) => c.shotBy === p.uid);
    const queueNorm = todayPlan.off ? 0 : Math.min(todayPlan.shootCap, myWaiting.length + myShots.length);
    const myTasks = tasks.filter((t: any) => t.uid === p.uid);
    return {
      person: p,
      off: todayPlan.off,
      note: todayPlan.note || "",
      plan: todayPlan,
      stories: { fact: todayOrg.stories, norm: todayPlan.off ? 0 : todayPlan.stories },
      reelsToday: { fact: todayOrg.reels, norm: todayPlan.off ? 0 : todayPlan.reels },
      reels: { fact: weekOrg.reels, norm: norms.reels },
      posts: { fact: weekOrg.posts, norm: norms.posts },
      shoot: { fact: myShots.length, norm: queueNorm, cap: todayPlan.shootCap, waiting: myWaiting.length },
      waiting: myWaiting,
      shots: myShots,
      tasks: myTasks,
      weekOrg,
      days: keys.map((k) => ({
        dateKey: k,
        plan: plan.days[k],
        fact: organic[p.uid]?.[k] || { stories: 0, reels: 0, posts: 0 },
      })),
    };
  });

  return NextResponse.json({
    success: true,
    todayKey,
    weekStart,
    weekKeys: keys,
    weekPeople,
    people,
    peopleAll: actor.role === "admin" ? peopleAll : people,
    team,
    waiting,
    ready,
    unplanned: waiting.filter((c) => !c.plannedCampaign),
    organic,
    tasks,
    unattributed,
    liveStories: actor.role === "smm" ? liveStories : [],
    ig,
    me: actor.person,
    role: actor.role,
  });
}
