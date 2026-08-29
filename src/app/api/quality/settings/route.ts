import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isActorError, requireQualityActor } from "@/lib/quality/auth";

const REF = () => adminDb.collection("quality_settings").doc("main");

export async function GET(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  if (actor.role !== "admin") {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  const snap = await REF().get();
  const d = snap.data() || {};
  const token = String(d.igToken || "");
  return NextResponse.json({
    success: true,
    settings: {
      igUserId: d.igUserId || "",
      hasToken: Boolean(token),
      tokenHint: token ? `…${token.slice(-4)}` : "",
      lastPollAt: d.lastPollAt || null,
      lastPollError: d.lastPollError || null,
      lastPollCount: d.lastPollCount || 0,
    },
  });
}

export async function PUT(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  if (actor.role !== "admin") {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (typeof body.igUserId === "string") patch.igUserId = body.igUserId.trim();
  if (typeof body.igToken === "string" && body.igToken.trim()) patch.igToken = body.igToken.trim();
  await REF().set(patch, { merge: true });
  return NextResponse.json({ success: true });
}
