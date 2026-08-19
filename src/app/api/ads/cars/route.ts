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

    const cars = rows.map((row: any) => {
      let d = row.data;
      if (typeof d === 'string') {
        try {
          d = JSON.parse(d);
        } catch {
          d = {};
        }
      }
      return {
        id: row.id,
        ...d,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      };
    });

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

    const carData: any = {
      name: String(body.name).trim(),
      priceUsd: numericPrice,
      priceTier,
      campaign: body.campaign || 'rk1',
      startedAt: body.startedAt || Date.now(),
    };

    if (body.carId) carData.carId = String(body.carId);
    if (body.year) carData.year = String(body.year).trim();
    if (body.maxDays) carData.maxDays = Number(body.maxDays);
    if (body.photoUrl) carData.photoUrl = String(body.photoUrl).trim();
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
