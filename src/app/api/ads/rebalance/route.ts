import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function getMidnight(timestamp: number = Date.now()): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function POST(request: Request) {
  try {
    let customTargetPerDay: number | undefined;
    try {
      const body = await request.json();
      if (body?.targetCarsPerDay) customTargetPerDay = Number(body.targetCarsPerDay);
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
    const todayMidnight = getMidnight(Date.now());
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

    // 3. Sort active cars by age (most seasoned/oldest cars first -> expire sooner)
    const sortedActive = [...activeCars].sort((a: any, b: any) => {
      const startedA = Number(a.startedAt) || (todayMidnight - 7 * 86400000);
      const startedB = Number(b.startedAt) || (todayMidnight - 7 * 86400000);
      return startedA - startedB;
    });

    const updatedCarsMap = new Map<string, any>();

    // 4. Distribute evenly: exactly targetCarsPerDay per day
    for (let i = 0; i < sortedActive.length; i++) {
      const car = sortedActive[i];
      const dayOffset = Math.floor(i / targetCarsPerDay);
      const targetRotationDate = todayMidnight + dayOffset * 86400000;

      const startedAt = Number(car.startedAt) || Date.now();
      const daysIn = Math.max(0, Math.floor((Date.now() - startedAt) / 86400000));
      const maxDays = dayOffset + daysIn;

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
