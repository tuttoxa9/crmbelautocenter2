import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isActorError, requireQualityActor } from "@/lib/quality/auth";
import type { SmmLane } from "@/lib/quality/types";

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

function laneOk(lane: SmmLane | undefined, planned: string | undefined) {
  if (!planned) return false;
  if (lane === "both") return planned === "rk1" || planned === "rk2";
  return lane === planned;
}

export async function POST(request: Request) {
  const actor = await requireQualityActor(request);
  if (isActorError(actor)) return actor;
  if (actor.role === "commission") {
    return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const carId = String(body.carId || "");
  if (!carId) {
    return NextResponse.json({ success: false, error: "Нет машины" }, { status: 400 });
  }
  const rows = await sql`SELECT id, data FROM ad_cars WHERE id = ${carId} LIMIT 1`;
  if (!rows.length) {
    return NextResponse.json({ success: false, error: "Машина не в рекламе" }, { status: 404 });
  }
  const car = parseCar(rows[0]);
  const nowIso = new Date().toISOString();

  if (action === "plan") {
    if (actor.role !== "admin") {
      return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
    }
    const planned = body.plannedCampaign === "rk2" ? "rk2" : body.plannedCampaign === "rk1" ? "rk1" : null;
    const next = { ...car, id: undefined, plannedCampaign: planned || undefined };
    delete (next as any).id;
    if (!planned) delete next.plannedCampaign;
    await sql`UPDATE ad_cars SET data = ${JSON.stringify(next)}, updated_at = ${nowIso} WHERE id = ${carId}`;
    return NextResponse.json({ success: true, car: { id: carId, ...next } });
  }

  if (action === "shot") {
    if (car.campaign !== "waiting_video") {
      return NextResponse.json({ success: false, error: "Уже не в очереди съёмки" }, { status: 400 });
    }
    if (actor.role === "smm") {
      if (!laneOk(actor.person?.lane, car.plannedCampaign)) {
        return NextResponse.json({ success: false, error: "Это не ваша линия" }, { status: 403 });
      }
    }
    const next = {
      ...car,
      campaign: "ready_for_ads",
      shotBy: actor.uid,
      shotByName: actor.person?.name || actor.email,
      shotAt: Date.now(),
    };
    if (typeof body.videoUrl === "string" && body.videoUrl) next.videoUrl = body.videoUrl;
    delete (next as any).id;
    await sql`UPDATE ad_cars SET data = ${JSON.stringify(next)}, updated_at = ${nowIso} WHERE id = ${carId}`;
    return NextResponse.json({ success: true, car: { id: carId, ...next } });
  }

  return NextResponse.json({ success: false, error: "Неизвестное действие" }, { status: 400 });
}
