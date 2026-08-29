import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isActorError, requireQualityActor } from "@/lib/quality/auth";
import { qualityTodayKey } from "@/lib/quality/dates";

export async function GET(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  const url = new URL(request.url);
  const dateKey = url.searchParams.get("dateKey") || qualityTodayKey();
  let q = adminDb.collection("quality_tasks").where("dateKey", "==", dateKey);
  if (actor.role === "smm") q = q.where("uid", "==", actor.uid);
  const snap = await q.get();
  const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  tasks.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
  return NextResponse.json({ success: true, tasks });
}

export async function POST(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  if (actor.role !== "admin") {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const uid = String(body.uid || "");
  const dateKey = String(body.dateKey || qualityTodayKey());
  if (!title || !uid) {
    return NextResponse.json({ success: false, error: "Нужны человек и текст" }, { status: 400 });
  }
  const ref = await adminDb.collection("quality_tasks").add({
    uid,
    dateKey,
    title,
    done: false,
    createdAt: Date.now(),
  });
  return NextResponse.json({ success: true, id: ref.id });
}

export async function PATCH(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ success: false, error: "Нет задачи" }, { status: 400 });
  const ref = adminDb.collection("quality_tasks").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ success: false, error: "Нет задачи" }, { status: 404 });
  const data = snap.data() || {};
  if (actor.role === "smm" && data.uid !== actor.uid) {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  if (actor.role === "smm") {
    await ref.set({ done: Boolean(body.done) }, { merge: true });
  } else if (actor.role === "admin") {
    const next: Record<string, unknown> = {};
    if (typeof body.done === "boolean") next.done = body.done;
    if (typeof body.title === "string") next.title = body.title.trim();
    await ref.set(next, { merge: true });
  } else {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  if (actor.role !== "admin") {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ success: false, error: "Нет задачи" }, { status: 400 });
  await adminDb.collection("quality_tasks").doc(id).delete();
  return NextResponse.json({ success: true });
}
