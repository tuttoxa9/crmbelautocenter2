import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isActorError, requireQualityActor } from "@/lib/quality/auth";
import { mondayKey, qualityTodayKey, weekKeys } from "@/lib/quality/dates";
import { fillWeek, remapWeek } from "@/lib/quality/weekFill";

async function smmUids(only?: string) {
  const peopleSnap = await adminDb.collection("users").where("role", "==", "smm").get();
  let uids = peopleSnap.docs.filter((d) => d.data()?.active !== false).map((d) => d.id);
  if (only) uids = uids.filter((id) => id === only);
  return uids;
}

export async function GET(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  const url = new URL(request.url);
  const weekStart = url.searchParams.get("weekStart") || mondayKey(qualityTodayKey());
  const snap = await adminDb.collection("quality_weeks").doc(weekStart).get();
  const uids = await smmUids(actor.role === "smm" ? actor.uid : undefined);
  const week = fillWeek(snap.data(), weekStart, uids);
  return NextResponse.json({ success: true, week, weekKeys: weekKeys(weekStart) });
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

export async function POST(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  if (actor.role !== "admin") {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  if (body.action !== "copy") {
    return NextResponse.json({ success: false, error: "Неизвестное действие" }, { status: 400 });
  }
  const fromStart = String(body.from || "");
  const toStart = String(body.to || mondayKey());
  if (!fromStart) {
    return NextResponse.json({ success: false, error: "Нет исходной недели" }, { status: 400 });
  }
  const uids = await smmUids();
  const fromSnap = await adminDb.collection("quality_weeks").doc(fromStart).get();
  const from = fillWeek(fromSnap.data(), fromStart, uids);
  const next = remapWeek(from, toStart, uids);
  await adminDb.collection("quality_weeks").doc(toStart).set({ ...next, updatedAt: Date.now() });
  return NextResponse.json({ success: true, week: next });
}
