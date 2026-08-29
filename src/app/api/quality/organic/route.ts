import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isActorError, requireQualityActor } from "@/lib/quality/auth";
import { qualityTodayKey } from "@/lib/quality/dates";
import type { OrganicKind } from "@/lib/quality/types";

function countId(uid: string, dateKey: string) {
  return `${uid}_${dateKey}`;
}

export async function POST(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  const body = await request.json().catch(() => ({}));
  const kind: OrganicKind = body.kind;
  if (kind !== "stories" && kind !== "reels" && kind !== "posts") {
    return NextResponse.json({ success: false, error: "Не тот тип" }, { status: 400 });
  }
  const delta = Number(body.delta);
  if (delta !== 1 && delta !== -1) {
    return NextResponse.json({ success: false, error: "Только ±1" }, { status: 400 });
  }
  let uid = actor.uid;
  if (actor.role === "admin" && body.uid) uid = String(body.uid);
  if (actor.role === "smm" && uid !== actor.uid) {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  if (actor.role === "commission") {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  const dateKey = String(body.dateKey || qualityTodayKey());
  const today = qualityTodayKey();
  if (actor.role === "smm" && dateKey !== today) {
    return NextResponse.json({ success: false, error: "Только сегодня" }, { status: 400 });
  }

  const ref = adminDb.collection("quality_counts").doc(countId(uid, dateKey));
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists ? snap.data() || {} : { uid, dateKey, stories: 0, reels: 0, posts: 0 };
    const nextVal = Math.max(0, Number(cur[kind] || 0) + delta);
    tx.set(ref, { ...cur, uid, dateKey, [kind]: nextVal, updatedAt: Date.now() }, { merge: true });
  });
  return NextResponse.json({ success: true });
}
