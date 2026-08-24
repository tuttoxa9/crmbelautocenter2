import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { calculatePriceTier } from '@/lib/services/adsService';
import crypto from 'crypto';

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, data, created_at, updated_at 
      FROM ad_cars 
      ORDER BY created_at DESC
    `;

    // Fetch catalog cars to check for sold status
    const catalogRows = await sql`SELECT id, data FROM cars`;
    const soldCarIds = new Set();
    for (const row of catalogRows) {
      let d = row.data;
      if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch { d = {}; }
      }
      if (!d || typeof d !== 'object') d = {};
      const isSold = d.status === 'sold' || d.isAvailable === false || d.is_available === false;
      if (isSold) soldCarIds.add(row.id);
    }

    const cars: any[] = [];
    
    for (const row of rows) {
      let d = row.data;
      if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch { d = {}; }
      }
      
      const carData = {
        id: row.id,
        ...d,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      };

      if (carData.carId && soldCarIds.has(carData.carId)) {
        // Automatically clean up sold cars from the ads tracking board
        sql`DELETE FROM ad_cars WHERE id = ${row.id}`.catch(e => console.error("Auto-cleanup error:", e));
      } else {
        cars.push(carData);
      }
    }

    return NextResponse.json({ success: true, cars });
  } catch (error: any) {
    console.error('Error fetching ad cars from Neon DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ad cars' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.priceUsd) {
      return NextResponse.json(
        { success: false, error: 'Name and priceUsd are required' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const numericPrice = Number(body.priceUsd);
    const priceTier = body.priceTier || calculatePriceTier(numericPrice);
    const campaign = body.campaign || 'rk1';
    const startedAt = body.startedAt || Date.now();

    // Smart Slot Allocation if campaign is active (rk1 / rk2)
    let targetRotationDate = body.targetRotationDate ? Number(body.targetRotationDate) : undefined;
    let maxDays = body.maxDays ? Number(body.maxDays) : undefined;

    if ((campaign === 'rk1' || campaign === 'rk2') && !targetRotationDate) {
      // Find current ad cars to find earliest open slot
      const existingCarsRows = await sql`SELECT data FROM ad_cars`;
      const existingCars = existingCarsRows.map((r: any) => {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return d;
      });

      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const midnightMs = todayMidnight.getTime();

      const countsByOffset: Record<number, number> = {};
      existingCars.forEach((c: any) => {
        if (c.campaign === 'rk1' || c.campaign === 'rk2') {
          let t = Number(c.targetRotationDate);
          if (!t && c.startedAt && c.maxDays) {
            t = Number(c.startedAt) + Number(c.maxDays) * 86400000;
          }
          if (t) {
            const targetMidnight = new Date(t);
            targetMidnight.setHours(0, 0, 0, 0);
            const offset = Math.round((targetMidnight.getTime() - midnightMs) / 86400000);
            if (offset >= 0) countsByOffset[offset] = (countsByOffset[offset] || 0) + 1;
          }
        }
      });

      // Target cars per day (default 3)
      const targetPerDay = 3;
      const minDaysAhead = campaign === 'rk2' ? 10 : 12;
      let chosenOffset = minDaysAhead;

      for (let offset = minDaysAhead; offset <= minDaysAhead + 45; offset++) {
        if ((countsByOffset[offset] || 0) < targetPerDay) {
          chosenOffset = offset;
          break;
        }
      }

      targetRotationDate = midnightMs + chosenOffset * 86400000;
      if (!maxDays) {
        maxDays = chosenOffset;
      }
    }

    const carData: any = {
      name: String(body.name).trim(),
      priceUsd: numericPrice,
      priceTier,
      campaign,
      startedAt,
    };

    if (targetRotationDate) carData.targetRotationDate = targetRotationDate;
    if (maxDays) carData.maxDays = maxDays;
    if (body.carId) carData.carId = String(body.carId);
    if (body.year) carData.year = String(body.year).trim();
    if (body.photoUrl) carData.photoUrl = String(body.photoUrl).trim();
    if (body.videoUrl) carData.videoUrl = String(body.videoUrl).trim();
    if (body.videoCoverUrl) carData.videoCoverUrl = String(body.videoCoverUrl).trim();
    if (body.notes) carData.notes = String(body.notes).trim();

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
      { success: false, error: error.message || 'Failed to create ad car' },
      { status: 500 }
    );
  }
}
