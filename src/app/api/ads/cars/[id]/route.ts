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
