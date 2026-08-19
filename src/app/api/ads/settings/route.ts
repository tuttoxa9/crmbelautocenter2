import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { DEFAULT_ADS_SETTINGS } from '@/lib/services/adsService';

export async function GET() {
  try {
    const rows = await sql`
      SELECT data FROM settings WHERE id = 'ads' LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        settings: DEFAULT_ADS_SETTINGS,
      });
    }

    let d = rows[0].data;
    if (typeof d === 'string') {
      try {
        d = JSON.parse(d);
      } catch {
        d = {};
      }
    }

    return NextResponse.json({
      success: true,
      settings: { ...DEFAULT_ADS_SETTINGS, ...d },
    });
  } catch (error: any) {
    console.error('Error fetching ads settings from Neon DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ads settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();

    const existing = await sql`
      SELECT id, data FROM settings WHERE id = 'ads' LIMIT 1
    `;

    let currentData = {};
    if (existing.length > 0) {
      currentData = existing[0].data;
      if (typeof currentData === 'string') {
        try {
          currentData = JSON.parse(currentData);
        } catch {
          currentData = {};
        }
      }
    }

    const mergedData = { ...currentData, ...body };

    await sql`
      INSERT INTO settings (id, data, created_at)
      VALUES ('ads', ${JSON.stringify(mergedData)}, ${now})
      ON CONFLICT (id) 
      DO UPDATE SET data = ${JSON.stringify(mergedData)}
    `;

    return NextResponse.json({
      success: true,
      settings: mergedData,
    });
  } catch (error: any) {
    console.error('Error saving ads settings to Neon DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save ads settings' },
      { status: 500 }
    );
  }
}
