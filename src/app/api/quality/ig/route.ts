import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isActorError, requireQualityActor } from "@/lib/quality/auth";
import { pollInstagram } from "@/lib/quality/igPoll";
import { qualityTodayKey } from "@/lib/quality/dates";

export async function GET(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "1";
  const unattributed = url.searchParams.get("unattributed") === "1";

  let snap;
  if (actor.role === "smm" || mine) {
    snap = await adminDb.collection("quality_ig_media").where("ownerUid", "==", actor.uid).limit(80).get();
  } else if (unattributed && actor.role === "admin") {
    snap = await adminDb.collection("quality_ig_media").where("ownerUid", "==", null).limit(80).get();
  } else if (actor.role === "admin") {
    snap = await adminDb.collection("quality_ig_media").limit(80).get();
  } else {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  const media = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
  return NextResponse.json({ success: true, media });
}

export async function POST(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  const body = await request.json().catch(() => ({}));

  if (body.action === "poll") {
    if (actor.role !== "admin") {
      return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
    }
    try {
      const result = await pollInstagram();
      return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
      await adminDb.collection("quality_settings").doc("main").set(
        { lastPollAt: Date.now(), lastPollError: err?.message || "ошибка Graph" },
        { merge: true },
      );
      return NextResponse.json({ success: false, error: err?.message || "Graph не ответил" }, { status: 502 });
    }
  }

  if (body.action === "assign") {
    const mediaId = String(body.mediaId || "");
    let uid = String(body.uid || "");
    if (actor.role === "smm") uid = actor.uid;
    if (actor.role === "commission") {
      return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
    }
    if (!mediaId || !uid) {
      return NextResponse.json({ success: false, error: "Нет ролика" }, { status: 400 });
    }
    const ref = adminDb.collection("quality_ig_media").doc(mediaId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Нет ролика" }, { status: 404 });
    const data = snap.data() || {};
    if (actor.role === "smm" && data.ownerUid) {
      return NextResponse.json({ success: false, error: "Уже чьё-то" }, { status: 400 });
    }
    const already = Boolean(data.credited);
    await ref.set({ ownerUid: uid }, { merge: true });
    if (!already) {
      const dateKey = data.dateKey || qualityTodayKey();
      const kind = data.source === "stories" ? "stories" : data.mediaType === "VIDEO" || data.mediaType === "REELS" ? "reels" : "posts";
      const countRef = adminDb.collection("quality_counts").doc(`${uid}_${dateKey}`);
      await adminDb.runTransaction(async (tx) => {
        const c = await tx.get(countRef);
        const cur = c.exists ? c.data() || {} : { uid, dateKey, stories: 0, reels: 0, posts: 0 };
        tx.set(countRef, { ...cur, uid, dateKey, [kind]: Number(cur[kind] || 0) + 1, updatedAt: Date.now() }, { merge: true });
      });
      await ref.set({ credited: true }, { merge: true });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Неизвестное действие" }, { status: 400 });
}
