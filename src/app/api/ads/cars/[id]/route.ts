import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  calculatePriceTier,
  getMinskDateKey,
  minskDateKeyToTimestamp,
  addDaysToDateKey,
  getDateKeyDiffDays,
} from '@/lib/services/adsService';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await sql`
      SELECT id, data FROM ad_cars WHERE id = ${id} LIMIT 1
    `;

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ad car not found' },
        { status: 404 }
      );
    }

    let currentData = existing[0].data;
    if (typeof currentData === 'string') {
      try {
        currentData = JSON.parse(currentData);
      } catch {
        currentData = {};
      }
    }

    const updatedData = { ...currentData, ...body };
    if (body.priceUsd !== undefined && !body.priceTier) {
      updatedData.priceTier = calculatePriceTier(Number(body.priceUsd));
    }

    const todayKey = getMinskDateKey(Date.now());

    // If campaign switched to rk1 or rk2, calculate next available slot if not explicitly provided
    const isCampaignSwitch = body.campaign && (body.campaign === 'rk1' || body.campaign === 'rk2') && body.campaign !== currentData.campaign;
    if (isCampaignSwitch && !body.targetRotationDate) {
      const existingCarsRows = await sql`SELECT id, data FROM ad_cars WHERE id != ${id}`;
      const countsByDateKey: Record<string, number> = {};
      const activeFutureDateKeys: string[] = [];
      
      existingCarsRows.forEach((r: any) => {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        if (d.campaign === 'rk1' || d.campaign === 'rk2') {
          let t = Number(d.targetRotationDate);
          if (!t && d.startedAt && d.maxDays) {
            t = Number(d.startedAt) + Number(d.maxDays) * 86400000;
          }
          if (t) {
            const dateKey = getMinskDateKey(t);
            countsByDateKey[dateKey] = (countsByDateKey[dateKey] || 0) + 1;
            if (dateKey >= todayKey) {
              activeFutureDateKeys.push(dateKey);
            }
          }
        }
      });

      const targetPerDay = 3;
      // Start checking from earliest active schedule date (e.g. 2026-08-30) or todayKey + 10 days
      const earliestScheduledKey = activeFutureDateKeys.length > 0 
        ? activeFutureDateKeys.sort()[0] 
        : addDaysToDateKey(todayKey, 10);
      
      const startScanKey = earliestScheduledKey > todayKey ? earliestScheduledKey : addDaysToDateKey(todayKey, 10);
      let chosenDateKey = startScanKey;

      for (let offset = 0; offset <= 60; offset++) {
        const testDateKey = addDaysToDateKey(startScanKey, offset);
        if ((countsByDateKey[testDateKey] || 0) < targetPerDay) {
          chosenDateKey = testDateKey;
          break;
        }
      }

      const daysLeftFromToday = Math.max(0, getDateKeyDiffDays(todayKey, chosenDateKey));
      updatedData.targetRotationDate = minskDateKeyToTimestamp(chosenDateKey);
      updatedData.maxDays = daysLeftFromToday;
      updatedData.startedAt = Date.now();
      updatedData.lastAlertSentAt = null;
    } else if (body.maxDays && !body.targetRotationDate) {
      // If maxDays is explicitly updated by user (e.g. inline edit to 14 days)
      const startedAt = Number(updatedData.startedAt) || Date.now();
      const daysIn = Math.max(0, Math.floor((Date.now() - startedAt) / 86400000));
      const daysLeft = Math.max(0, Number(body.maxDays) - daysIn);
      const targetKey = addDaysToDateKey(todayKey, daysLeft);
      updatedData.targetRotationDate = minskDateKeyToTimestamp(targetKey);
    }

    const now = new Date().toISOString();

    await sql`
      UPDATE ad_cars 
      SET data = ${JSON.stringify(updatedData)}, updated_at = ${now}
      WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      car: { id, ...updatedData },
    });
  } catch (error: any) {
    console.error('Error updating ad car in Neon DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update ad car' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await sql`
      DELETE FROM ad_cars WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting ad car from Neon DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete ad car' },
      { status: 500 }
    );
  }
}
