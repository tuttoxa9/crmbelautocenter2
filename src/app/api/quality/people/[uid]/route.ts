import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { adminDb } from "@/lib/firebaseAdmin";
import { isActorError, requireQualityActor } from "@/lib/quality/auth";
import { normalizeMarker } from "@/lib/quality/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  if (actor.role !== "admin") {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  const { uid } = await params;
  const body = await request.json().catch(() => ({}));
  const ref = adminDb.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ success: false, error: "Нет такого человека" }, { status: 404 });
  }
  const current = snap.data() || {};
  const next = { ...current };
  if (typeof body.name === "string" && body.name.trim()) next.name = body.name.trim();
  if (body.role === "smm" || body.role === "commission" || body.role === "admin") next.role = body.role;
  if (["rk1", "rk2", "both", "none"].includes(body.lane)) next.lane = body.lane;
  if (typeof body.marker === "string") next.marker = normalizeMarker(body.marker);
  if (typeof body.active === "boolean") next.active = body.active;

  if (next.marker) {
    const all = await adminDb.collection("users").get();
    const clash = all.docs.some((d) => d.id !== uid && d.data()?.marker === next.marker && d.data()?.active !== false);
    if (clash) {
      return NextResponse.json({ success: false, error: "Такой код уже есть" }, { status: 400 });
    }
  }

  await ref.set(next, { merge: true });

  if (typeof body.password === "string" && body.password.length >= 6) {
    try {
      await admin.auth().updateUser(uid, { password: body.password });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err?.message || "Пароль не сменился" }, { status: 500 });
    }
  }
  if (typeof body.active === "boolean") {
    try {
      await admin.auth().updateUser(uid, { disabled: !body.active });
    } catch {
      // profile still saved
    }
  }

  return NextResponse.json({ success: true, person: { uid, ...next } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  if (actor.role !== "admin") {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  const { uid } = await params;
  if (uid === actor.uid) {
    return NextResponse.json({ success: false, error: "Себя не отключаем" }, { status: 400 });
  }
  await adminDb.collection("users").doc(uid).set({ active: false }, { merge: true });
  try {
    await admin.auth().updateUser(uid, { disabled: true });
  } catch {
    // profile still off
  }
  return NextResponse.json({ success: true });
}
