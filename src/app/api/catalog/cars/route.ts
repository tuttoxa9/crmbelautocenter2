import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const IMAGE_HOST = process.env.NEXT_PUBLIC_IMAGE_HOST || 'https://images.belautocenter.by';

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
        const createdAt = d.createdAt || d.created_at || row.created_at || null;

        // Определяем полный URL фото
        let photoUrl = '';
        const rawImages = d.imageUrls || d.images || d.photos || [];
        let firstImg = '';
        if (Array.isArray(rawImages) && rawImages.length > 0) {
          firstImg = typeof rawImages[0] === 'string' ? rawImages[0] : (rawImages[0]?.url || '');
        } else if (typeof d.mainImage === 'string') {
          firstImg = d.mainImage;
        } else if (typeof d.photo === 'string') {
          firstImg = d.photo;
        }

        if (firstImg) {
          if (firstImg.startsWith('http://') || firstImg.startsWith('https://')) {
            photoUrl = firstImg;
          } else {
            const cleanPath = firstImg.replace(/^\/+/, '');
            photoUrl = `${IMAGE_HOST}/${cleanPath}`;
          }
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
          createdAt,
          monthlyPayment: d.monthlyPayment || d.paymentPerMonth || null,
        };
      })
      .filter((c: any) => !c.isSold && c.priceUsd > 0)
      .sort((a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA; // Сначала самые новые
      });

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
