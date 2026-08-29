import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getMinskDateKey } from "@/lib/services/adsService";
import {
  planCompact,
  planEqualize,
  planPostponeCars,
  planPostponeDay,
  planShift,
  stampDate,
  type TapeCar,
} from "@/lib/services/adsSchedule";

async function getTargetPerDay(): Promise<number> {
  try {
    const settingsRows = await sql`SELECT data FROM settings WHERE id = 'ads' LIMIT 1`;
    if (settingsRows.length > 0) {
      const raw = settingsRows[0].data;
      const d = typeof raw === "string" ? JSON.parse(raw) : raw;
      const n = Number(d?.targetCarsPerDay);
      if (n > 0) return n;
    }
  } catch {
    // default
  }
  return 3;
}

async function loadCars(): Promise<{ id: string; data: any; created_at: any; updated_at: any }[]> {
  const rows = await sql`SELECT id, data, created_at, updated_at FROM ad_cars`;
  return rows as any[];
}

function toTape(rows: { id: string; data: any }[]): TapeCar[] {
  return rows.map((r) => {
    const d = typeof r.data === "string" ? JSON.parse(r.data) : r.data || {};
    return { id: r.id, ...d };
  });
}

async function persistStamps(
  rows: { id: string; data: any; created_at: any; updated_at: any }[],
  stamps: { id: string; dateKey: string }[],
  todayKey: string,
) {
  const stampMap = new Map(stamps.map((s) => [s.id, s.dateKey]));
  const nowIso = new Date().toISOString();
  const out: any[] = [];

  for (const row of rows) {
    let d = row.data;
    if (typeof d === "string") {
      try {
        d = JSON.parse(d);
      } catch {
        d = {};
      }
    }
    const dateKey = stampMap.get(row.id);
    const next = dateKey ? stampDate({ id: row.id, ...d }, dateKey, todayKey) : { id: row.id, ...d };
    delete (next as any).id;
    if (dateKey) {
      await sql`
        UPDATE ad_cars
        SET data = ${JSON.stringify(next)}, updated_at = ${nowIso}
        WHERE id = ${row.id}
      `;
    }
    out.push({
      id: row.id,
      ...next,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      updatedAt: Date.now(),
    });
  }
  return out;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");
    const preview = Boolean(body.preview);
    const todayKey = getMinskDateKey(Date.now());
    const perDay = await getTargetPerDay();
    const rows = await loadCars();
    const tape = toTape(rows);

    let stamps: { id: string; dateKey: string }[] = [];
    let extra: Record<string, unknown> = {};

    if (action === "equalize") {
      const plan = planEqualize(tape, todayKey, perDay);
      stamps = plan.stamps;
      extra = {
        message: plan.message,
        need: plan.need,
        daysToEven: plan.daysToEven,
        current: plan.current,
        target: plan.target,
        startKey: plan.startKey,
        days: plan.days.slice(0, 21),
      };
    } else if (action === "compact") {
      const plan = planCompact(tape, todayKey, perDay);
      stamps = plan.stamps;
      extra = { days: plan.days.slice(0, 21), message: "Дырки закрыты, порядок машин тот же." };
    } else if (action === "shift") {
      const days = Number(body.days);
      const fromDateKey = String(body.fromDateKey || todayKey);
      if (!days || days < 1 || days > 21) {
        return NextResponse.json({ success: false, error: "Сдвиг 1–21 день" }, { status: 400 });
      }
      const plan = planShift(tape, fromDateKey, days);
      stamps = plan.stamps;
      extra = {
        days: plan.days.slice(0, 28),
        message: `График с ${fromDateKey} сдвинут на ${days} дн. Эти дни пустые.`,
      };
    } else if (action === "postponeCars") {
      const carIds = Array.isArray(body.carIds) ? body.carIds.map(String) : [];
      const toDateKey = String(body.toDateKey || "");
      if (!carIds.length || !toDateKey) {
        return NextResponse.json({ success: false, error: "Нужны авто и дата" }, { status: 400 });
      }
      const plan = planPostponeCars(tape, carIds, toDateKey, todayKey, perDay);
      stamps = plan.stamps;
      extra = { days: plan.days.slice(0, 21), message: "Машина встанет первой в выбранный день." };
    } else if (action === "postponeDay") {
      const fromDateKey = String(body.fromDateKey || "");
      const toDateKey = String(body.toDateKey || "");
      if (!fromDateKey || !toDateKey) {
        return NextResponse.json({ success: false, error: "Нужны даты" }, { status: 400 });
      }
      const plan = planPostponeDay(tape, fromDateKey, toDateKey, todayKey, perDay);
      stamps = plan.stamps;
      extra = { days: plan.days.slice(0, 21), message: "День встанет в начало выбранной даты, остальные уступят." };
    } else {
      return NextResponse.json({ success: false, error: "Неизвестное действие" }, { status: 400 });
    }

    if (preview) {
      return NextResponse.json({ success: true, preview: true, ...extra, total: stamps.length });
    }

    const cars = await persistStamps(rows, stamps, todayKey);
    return NextResponse.json({ success: true, cars, total: stamps.length, ...extra });
  } catch (error: any) {
    console.error("ads schedule", error);
    return NextResponse.json(
      { success: false, error: error.message || "Не удалось пересчитать график" },
      { status: 500 },
    );
  }
}
