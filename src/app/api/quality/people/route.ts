import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { adminDb } from "@/lib/firebaseAdmin";
import { isActorError, requireQualityActor } from "@/lib/quality/auth";
import { normalizeMarker, type CrmPerson, type SmmLane } from "@/lib/quality/types";

async function listPeople(): Promise<CrmPerson[]> {
  const snap = await adminDb.collection("users").get();
  return snap.docs.map((doc) => {
    const d = doc.data() || {};
    return {
      uid: doc.id,
      email: d.email || "",
      name: d.name || "",
      role: d.role || "admin",
      marker: d.marker || "",
      lane: d.lane || "none",
      active: d.active !== false,
      createdAt: d.createdAt || 0,
    } as CrmPerson;
  }).sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export async function GET(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  if (actor.role === "smm") {
    return NextResponse.json({ success: true, people: actor.person ? [actor.person] : [] });
  }
  if (actor.role !== "admin") {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  const people = await listPeople();
  return NextResponse.json({ success: true, people });
}

export async function POST(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  if (actor.role !== "admin") {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  const role = body.role === "smm" || body.role === "commission" || body.role === "admin" ? body.role : "smm";
  const lane: SmmLane = ["rk1", "rk2", "both", "none"].includes(body.lane) ? body.lane : "none";
  const marker = normalizeMarker(String(body.marker || ""));

  if (!email || !password || password.length < 6 || !name) {
    return NextResponse.json({ success: false, error: "Имя, почта и пароль от 6 символов" }, { status: 400 });
  }
  if (role === "smm" && marker) {
    const people = await listPeople();
    if (people.some((p) => p.marker && p.marker === marker && p.active)) {
      return NextResponse.json({ success: false, error: "Такой код уже есть" }, { status: 400 });
    }
  }

  try {
    const created = await admin.auth().createUser({ email, password, displayName: name });
    const person: CrmPerson = {
      uid: created.uid,
      email,
      name,
      role,
      marker,
      lane,
      active: true,
      createdAt: Date.now(),
    };
    await adminDb.collection("users").doc(created.uid).set(person);
    return NextResponse.json({ success: true, person });
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("email-already-exists") || msg.includes("EMAIL_EXISTS")) {
      return NextResponse.json({ success: false, error: "Такая почта уже есть" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: msg || "Не удалось создать" }, { status: 500 });
  }
}
