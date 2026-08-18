import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || "postgresql://neondb_owner:npg_j7eSMifBFtd3@ep-curly-brook-ascm3kjp-pooler.c-4.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
    
    const sql = neon(connectionString);
    const rows = await sql`SELECT id, data, created_at FROM cars ORDER BY created_at DESC`;

    const availableCars = rows
      .map((row: any) => {
        let d = row.data;
        if (typeof d === 'string') {
          try {
            d = JSON.parse(d);
          } catch (e) {
            d = {};
          }
        }
        if (!d || typeof d !== 'object') d = {};

        const make = d.make || d.brand || d.mark || '';
        const model = d.model || '';
        const name = `${make} ${model}`.trim() || d.name || d.title || 'Автомобиль';
        const year = d.year || '';
        const priceUsd = Number(d.priceUsd || d.priceUSD || d.price || d.price_usd || 0);
        const isSold = d.status === 'sold' || d.isAvailable === false || d.is_available === false;

        // Ищем главное фото
        let photoUrl = '';
        if (Array.isArray(d.images) && d.images.length > 0) {
          photoUrl = d.images[0];
        } else if (d.mainImage) {
          photoUrl = d.mainImage;
        } else if (d.photo) {
          photoUrl = d.photo;
        } else if (d.image) {
          photoUrl = d.image;
        }

        return {
          id: row.id,
          name,
          make,
          model,
          year,
          priceUsd,
          isSold,
          photoUrl,
          monthlyPayment: d.monthlyPayment || d.paymentPerMonth || null,
        };
      })
      .filter((c: any) => !c.isSold && c.priceUsd > 0)
      .sort((a: any, b: any) => a.priceUsd - b.priceUsd);

    return NextResponse.json({
      success: true,
      total: availableCars.length,
      cars: availableCars,
    });
  } catch (error: any) {
    console.error('Error fetching catalog cars from Neon:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch catalog cars' },
      { status: 500 }
    );
  }
}
