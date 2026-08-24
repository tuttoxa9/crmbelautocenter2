import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { calculatePriceTier } from '@/lib/services/adsService';

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

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const midnightMs = todayMidnight.getTime();

    // If campaign switched to rk1 or rk2, calculate next available slot if not explicitly provided
    const isCampaignSwitch = body.campaign && (body.campaign === 'rk1' || body.campaign === 'rk2') && body.campaign !== currentData.campaign;
    if (isCampaignSwitch && !body.targetRotationDate) {
      const existingCarsRows = await sql`SELECT id, data FROM ad_cars WHERE id != ${id}`;
      const countsByOffset: Record<number, number> = {};
      
      existingCarsRows.forEach((r: any) => {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        if (d.campaign === 'rk1' || d.campaign === 'rk2') {
          let t = Number(d.targetRotationDate);
          if (!t && d.startedAt && d.maxDays) {
            t = Number(d.startedAt) + Number(d.maxDays) * 86400000;
          }
          if (t) {
            const targetMidnight = new Date(t);
            targetMidnight.setHours(0, 0, 0, 0);
            const offset = Math.round((targetMidnight.getTime() - midnightMs) / 86400000);
            if (offset >= 0) countsByOffset[offset] = (countsByOffset[offset] || 0) + 1;
          }
        }
      });

      const targetPerDay = 3;
      const minDaysAhead = body.campaign === 'rk2' ? 10 : 12;
      let chosenOffset = minDaysAhead;

      for (let offset = minDaysAhead; offset <= minDaysAhead + 45; offset++) {
        if ((countsByOffset[offset] || 0) < targetPerDay) {
          chosenOffset = offset;
          break;
        }
      }

      updatedData.targetRotationDate = midnightMs + chosenOffset * 86400000;
      updatedData.maxDays = chosenOffset;
      updatedData.startedAt = Date.now();
      updatedData.lastAlertSentAt = null;
    } else if (body.maxDays && !body.targetRotationDate) {
      // If maxDays is explicitly updated by user (e.g. inline edit to 14 days)
      const startedAt = Number(updatedData.startedAt) || Date.now();
      const daysIn = Math.max(0, Math.floor((Date.now() - startedAt) / 86400000));
      const daysLeft = Math.max(0, Number(body.maxDays) - daysIn);
      updatedData.targetRotationDate = midnightMs + daysLeft * 86400000;
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
