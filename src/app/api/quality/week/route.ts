import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isActorError, requireQualityActor } from "@/lib/quality/auth";
import { mondayKey, qualityTodayKey, weekKeys } from "@/lib/quality/dates";
import {
  DEFAULT_WEEK_POSTS,
  DEFAULT_WEEK_REELS,
  emptyDay,
  type PersonWeek,
  type QualityWeek,
} from "@/lib/quality/types";

function fillWeek(raw: any, weekStart: string, uids: string[]): QualityWeek {
  const keys = weekKeys(weekStart);
  const people: Record<string, PersonWeek> = {};
  for (const uid of uids) {
    const src = raw?.people?.[uid] || {};
    const days: PersonWeek["days"] = {};
    keys.forEach((k, i) => {
      const cell = src.days?.[k];
      const sun = i === 6;
      days[k] = cell
        ? {
            stories: Math.max(0, Number(cell.stories) || 0),
            shootCap: Math.max(0, Number(cell.shootCap) || 0),
            off: Boolean(cell.off),
          }
        : emptyDay(sun);
    });
    people[uid] = {
      reelsPerWeek: Math.max(0, Number(src.reelsPerWeek ?? DEFAULT_WEEK_REELS)),
      postsPerWeek: Math.max(0, Number(src.postsPerWeek ?? DEFAULT_WEEK_POSTS)),
      days,
    };
  }
  return { weekStart, people };
}

export async function GET(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  const url = new URL(request.url);
  const weekStart = url.searchParams.get("weekStart") || mondayKey(qualityTodayKey());
  const snap = await adminDb.collection("quality_weeks").doc(weekStart).get();
  const peopleSnap = await adminDb.collection("users").where("role", "==", "smm").get();
  let uids = peopleSnap.docs.filter((d) => d.data()?.active !== false).map((d) => d.id);
  if (actor.role === "smm") uids = uids.filter((id) => id === actor.uid);
  const week = fillWeek(snap.data(), weekStart, uids);
  return NextResponse.json({ success: true, week });
}

export async function PUT(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  if (actor.role !== "admin") {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const weekStart = String(body.weekStart || mondayKey());
  const people = body.people && typeof body.people === "object" ? body.people : {};
  await adminDb.collection("quality_weeks").doc(weekStart).set({ weekStart, people, updatedAt: Date.now() });
  return NextResponse.json({ success: true });
}
