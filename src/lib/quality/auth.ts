import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyFirebaseIdToken } from "@/lib/verifyToken";
import type { CrmPerson, CrmRole } from "./types";

const COMMISSION_EMAIL = "comis@belauto.by";

export type QualityActor = {
  uid: string;
  email: string;
  role: CrmRole;
  person: CrmPerson | null;
};

export async function requireQualityActor(request: Request): Promise<QualityActor | NextResponse> {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, error: "Нужен вход" }, { status: 401 });
  }
  let tokenUser: any;
  try {
    tokenUser = await verifyFirebaseIdToken(header.slice(7));
  } catch {
    return NextResponse.json({ success: false, error: "Сессия истекла" }, { status: 401 });
  }
  const uid = String(tokenUser.localId || tokenUser.uid || "");
  const email = String(tokenUser.email || "").toLowerCase();
  if (!uid) {
    return NextResponse.json({ success: false, error: "Нужен вход" }, { status: 401 });
  }

  const snap = await adminDb.collection("users").doc(uid).get();
  if (snap.exists) {
    const d = snap.data() || {};
    const role = (d.role as CrmRole) || "admin";
    const person: CrmPerson = {
      uid,
      email: d.email || email,
      name: d.name || email.split("@")[0],
      role,
      marker: d.marker || "",
      lane: d.lane || "none",
      active: d.active !== false,
      createdAt: d.createdAt || Date.now(),
    };
    if (role === "smm" && !person.active) {
      return NextResponse.json({ success: false, error: "Аккаунт отключён" }, { status: 403 });
    }
    return { uid, email, role, person };
  }

  if (email === COMMISSION_EMAIL) {
    return { uid, email, role: "commission", person: null };
  }

  return {
    uid,
    email,
    role: "admin",
    person: {
      uid,
      email,
      name: email.split("@")[0] || "Админ",
      role: "admin",
      marker: "",
      lane: "none",
      active: true,
      createdAt: Date.now(),
    },
  };
}

export function isActorError(v: QualityActor | NextResponse): v is NextResponse {
  return !("uid" in v);
}
