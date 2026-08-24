import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  getMinskDateKey,
  minskDateKeyToTimestamp,
  addDaysToDateKey,
  getDateKeyDiffDays,
} from '@/lib/services/adsService';

export async function POST(request: Request) {
  try {
    let customTargetPerDay: number | undefined;
    let customStartDateKey: string | undefined;

    try {
      const body = await request.json();
      if (body?.targetCarsPerDay) customTargetPerDay = Number(body.targetCarsPerDay);
      if (body?.startDate) customStartDateKey = getMinskDateKey(Number(body.startDate));
      if (body?.startDateKey) customStartDateKey = String(body.startDateKey);
    } catch {
      // Empty body is okay
    }

    // 1. Load settings from Neon DB
    const settingsRows = await sql`
      SELECT data FROM settings WHERE id = 'ads' LIMIT 1
    `;
    let adsSettings: any = {};
    if (settingsRows.length > 0) {
      const raw = settingsRows[0].data;
      adsSettings = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }

    const targetCarsPerDay = Math.max(1, customTargetPerDay || Number(adsSettings?.targetCarsPerDay) || 3);
    const todayKey = getMinskDateKey(Date.now());
    const nowIso = new Date().toISOString();

    // 2. Fetch all ad_cars
    const rows = await sql`
      SELECT id, data, created_at, updated_at 
      FROM ad_cars 
      ORDER BY created_at DESC
    `;

    const allCars = rows.map((r: any) => {
      const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      return {
        id: r.id,
        ...d,
        createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
      };
    });

    const activeCars = allCars.filter((c: any) => c.campaign === 'rk1' || c.campaign === 'rk2');

    // Find start date key:
    // If explicitly provided, use customStartDateKey.
    // Otherwise, check if active cars are already scheduled to start at a future date (e.g. 2026-08-30).
    let startKey = todayKey;
    if (customStartDateKey) {
      startKey = customStartDateKey;
    } else {
      const futureDateKeys = activeCars
        .map((c: any) => {
          const t = Number(c.targetRotationDate);
          return t ? getMinskDateKey(t) : null;
        })
        .filter((k: string | null): k is string => k !== null && k >= todayKey);

      if (futureDateKeys.length > 0) {
        startKey = futureDateKeys.sort()[0];
      }
    }

    // 3. Sort active cars by age (most seasoned/oldest cars first -> expire sooner)
    const sortedActive = [...activeCars].sort((a: any, b: any) => {
      const startedA = Number(a.startedAt) || (Date.now() - 7 * 86400000);
      const startedB = Number(b.startedAt) || (Date.now() - 7 * 86400000);
      return startedA - startedB;
    });

    const updatedCarsMap = new Map<string, any>();

    // 4. Distribute evenly: exactly targetCarsPerDay per calendar day starting from startKey
    for (let i = 0; i < sortedActive.length; i++) {
      const car = sortedActive[i];
      const dayOffset = Math.floor(i / targetCarsPerDay);
      const targetDateKey = addDaysToDateKey(startKey, dayOffset);
      const targetRotationDate = minskDateKeyToTimestamp(targetDateKey);

      const startedAt = Number(car.startedAt) || Date.now();
      const daysIn = Math.max(0, Math.floor((Date.now() - startedAt) / 86400000));
      const daysLeftFromToday = Math.max(0, getDateKeyDiffDays(todayKey, targetDateKey));
      const maxDays = daysIn + daysLeftFromToday;

      const updatedCarData = {
        ...car,
        targetRotationDate,
        maxDays,
        updatedAt: Date.now(),
      };
      delete updatedCarData.id;

      updatedCarsMap.set(car.id, updatedCarData);
    }

    // 5. Update Neon DB
    const updatePromises = Array.from(updatedCarsMap.entries()).map(([id, data]) => {
      return sql`
        UPDATE ad_cars 
        SET data = ${JSON.stringify(data)}, updated_at = ${nowIso}
        WHERE id = ${id}
      `;
    });

    await Promise.all(updatePromises);

    // 6. Return all cars with fresh data
    const finalCars = allCars.map((c: any) => {
      if (updatedCarsMap.has(c.id)) {
        return { id: c.id, ...updatedCarsMap.get(c.id) };
      }
      return c;
    });

    return NextResponse.json({
      success: true,
      totalBalanced: sortedActive.length,
      targetCarsPerDay,
      startKey,
      cars: finalCars,
    });
  } catch (error: any) {
    console.error('Error in ads rebalance route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to rebalance ad cars' },
      { status: 500 }
    );
  }
}
