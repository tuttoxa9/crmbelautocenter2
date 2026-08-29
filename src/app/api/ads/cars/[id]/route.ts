import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  calculatePriceTier,
  getMinskDateKey,
  minskDateKeyToTimestamp,
  addDaysToDateKey,
  getDateKeyDiffDays,
} from '@/lib/services/adsService';
import { pickNextSlotDateKey, isAirCampaign } from '@/lib/services/adsSchedule';

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

    const isCampaignSwitch =
      body.campaign &&
      (body.campaign === 'rk1' || body.campaign === 'rk2') &&
      body.campaign !== currentData.campaign;

    if (isCampaignSwitch && !body.targetRotationDate) {
      const existingCarsRows = await sql`SELECT id, data FROM ad_cars WHERE id != ${id}`;
      const others = existingCarsRows.map((r: any) => {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return d;
      });
      const targetPerDay = await getTargetPerDay();
      const incoming = isAirCampaign(body.campaign) ? body.campaign : 'rk1';
      const chosenDateKey = pickNextSlotDateKey(others, todayKey, targetPerDay, incoming, { allowToday: false });
      const daysLeftFromToday = Math.max(0, getDateKeyDiffDays(todayKey, chosenDateKey));
      updatedData.targetRotationDate = minskDateKeyToTimestamp(chosenDateKey);
      updatedData.maxDays = daysLeftFromToday;
      updatedData.startedAt = Date.now();
      updatedData.lastAlertSentAt = null;
    } else if (body.maxDays && !body.targetRotationDate) {
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
