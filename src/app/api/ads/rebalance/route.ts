import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getMinskDateKey } from '@/lib/services/adsService';
import { planCompact, stampDate } from '@/lib/services/adsSchedule';

export async function POST() {
  try {
    const settingsRows = await sql`
      SELECT data FROM settings WHERE id = 'ads' LIMIT 1
    `;
    let adsSettings: any = {};
    if (settingsRows.length > 0) {
      const raw = settingsRows[0].data;
      adsSettings = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }

    const targetCarsPerDay = Math.max(1, Number(adsSettings?.targetCarsPerDay) || 3);
    const todayKey = getMinskDateKey(Date.now());
    const nowIso = new Date().toISOString();

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

    const plan = planCompact(allCars, todayKey, targetCarsPerDay);
    const stampMap = new Map(plan.stamps.map((s) => [s.id, s.dateKey]));

    for (const car of allCars) {
      const dateKey = stampMap.get(car.id);
      if (!dateKey) continue;
      const data = stampDate(car, dateKey, todayKey);
      const { id, createdAt, updatedAt, ...rest } = data as any;
      await sql`
        UPDATE ad_cars 
        SET data = ${JSON.stringify(rest)}, updated_at = ${nowIso}
        WHERE id = ${id}
      `;
    }

    const finalCars = allCars.map((c: any) => {
      const dateKey = stampMap.get(c.id);
      if (!dateKey) return c;
      return { ...stampDate(c, dateKey, todayKey), updatedAt: Date.now() };
    });

    return NextResponse.json({
      success: true,
      totalBalanced: plan.stamps.length,
      targetCarsPerDay,
      startKey: todayKey,
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
