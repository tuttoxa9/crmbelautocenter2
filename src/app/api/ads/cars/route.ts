import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  calculatePriceTier,
  getMinskDateKey,
  minskDateKeyToTimestamp,
  getDateKeyDiffDays,
} from '@/lib/services/adsService';
import { pickNextSlotDateKey, isAirCampaign } from '@/lib/services/adsSchedule';
import { appendHistory } from '@/lib/ads/mutate';
import { sweepSoldAdCars } from '@/lib/ads/sold';
import crypto from 'crypto';

async function getTargetPerDay(): Promise<number> {
  try {
    const settingsRows = await sql`SELECT data FROM settings WHERE id = 'ads' LIMIT 1`;
    if (settingsRows.length > 0) {
      const raw = settingsRows[0].data;
      const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const n = Number(d?.targetCarsPerDay);
      if (n > 0) return n;
    }
  } catch {
    // fall through
  }
  return 3;
}

export async function GET() {
  try {
    await sweepSoldAdCars();

    const rows = await sql`
      SELECT id, data, created_at, updated_at 
      FROM ad_cars 
      ORDER BY created_at DESC
    `;

    const cars: any[] = [];

    for (const row of rows) {
      let d = row.data;
      if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch { d = {}; }
      }

      cars.push({
        id: row.id,
        ...d,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      });
    }

    return NextResponse.json({ success: true, cars });
  } catch (error: any) {
    console.error('Error fetching ad cars from Neon DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Не получилось загрузить доску' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.priceUsd) {
      return NextResponse.json(
        { success: false, error: 'Нужны название и цена' },
        { status: 400 }
      );
    }

    if (body.carId) {
      const existingRows = await sql`SELECT id, data FROM ad_cars`;
      for (const row of existingRows) {
        let d = row.data;
        if (typeof d === "string") {
          try { d = JSON.parse(d); } catch { d = {}; }
        }
        if (d?.carId && String(d.carId) === String(body.carId)) {
          return NextResponse.json(
            { success: false, error: "Эта машина уже на доске" },
            { status: 409 }
          );
        }
      }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const numericPrice = Number(body.priceUsd);
    const priceTier = body.priceTier || calculatePriceTier(numericPrice);
    const campaign = body.campaign || 'waiting_video';
    const startedAt = body.startedAt || Date.now();

    const todayKey = getMinskDateKey(Date.now());

    let targetRotationDate = body.targetRotationDate ? Number(body.targetRotationDate) : undefined;
    let maxDays = body.maxDays ? Number(body.maxDays) : undefined;

    if ((campaign === 'rk1' || campaign === 'rk2') && !targetRotationDate) {
      await sweepSoldAdCars();
      const existingCarsRows = await sql`SELECT data FROM ad_cars`;
      const existing = existingCarsRows.map((r: any) => {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return d;
      });
      const targetPerDay = await getTargetPerDay();
      const incoming = isAirCampaign(campaign) ? campaign : 'rk1';
      const chosenDateKey = pickNextSlotDateKey(existing, todayKey, targetPerDay, incoming, { allowToday: true });
      const daysLeftFromToday = Math.max(0, getDateKeyDiffDays(todayKey, chosenDateKey));
      targetRotationDate = minskDateKeyToTimestamp(chosenDateKey);
      if (!maxDays) maxDays = daysLeftFromToday;
    }

    const carData: any = {
      name: String(body.name).trim(),
      priceUsd: numericPrice,
      priceTier,
      campaign,
      startedAt,
      source: body.carId ? "catalog" : "manual",
    };

    if (targetRotationDate) carData.targetRotationDate = targetRotationDate;
    if (maxDays) carData.maxDays = maxDays;
    if (body.carId) carData.carId = String(body.carId);
    if (body.year) carData.year = String(body.year).trim();
    if (body.photoUrl) carData.photoUrl = String(body.photoUrl).trim();
    if (body.videoUrl) carData.videoUrl = String(body.videoUrl).trim();
    if (body.videoCoverUrl) carData.videoCoverUrl = String(body.videoCoverUrl).trim();
    if (body.notes) carData.notes = String(body.notes).trim();
    appendHistory(carData, { kind: "add", to: campaign });

    await sql`
      INSERT INTO ad_cars (id, data, created_at, updated_at)
      VALUES (${id}, ${JSON.stringify(carData)}, ${now}, ${now})
    `;

    return NextResponse.json({
      success: true,
      car: {
        id,
        ...carData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });
  } catch (error: any) {
    console.error('Error creating ad car in Neon DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Не получилось добавить машину' },
      { status: 500 }
    );
  }
}
