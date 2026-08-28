import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const IMAGE_HOST = process.env.NEXT_PUBLIC_IMAGE_HOST || 'https://images.belautocenter.by';

function mapCar(row: { id: string; data: unknown; created_at?: unknown }) {
  let d = row.data as Record<string, unknown> | string | null;
  if (typeof d === 'string') {
    try {
      d = JSON.parse(d);
    } catch {
      d = {};
    }
  }
  if (!d || typeof d !== 'object') d = {};

  const rec = d as Record<string, unknown>;
  const make = String(rec.make || rec.brand || rec.mark || '');
  const model = String(rec.model || '');
  const name = `${make} ${model}`.trim() || String(rec.name || rec.title || 'Автомобиль');
  const year = (rec.year as string | number | undefined) || '';
  const priceUsd = Number(rec.priceUsd || rec.priceUSD || rec.price || rec.price_usd || 0);
  const isSold = rec.status === 'sold' || rec.isAvailable === false || rec.is_available === false;
  const createdAt = rec.createdAt || rec.created_at || row.created_at || null;
  const mileage = rec.mileage != null ? Number(rec.mileage) : rec.odometer != null ? Number(rec.odometer) : null;

  let photoUrl = '';
  const rawImages = rec.imageUrls || rec.images || rec.photos || [];
  let firstImg = '';
  if (Array.isArray(rawImages) && rawImages.length > 0) {
    const first = rawImages[0] as unknown;
    firstImg = typeof first === 'string' ? first : (first && typeof first === 'object' && 'url' in first ? String((first as { url: string }).url) : '');
  } else if (typeof rec.mainImage === 'string') {
    firstImg = rec.mainImage;
  } else if (typeof rec.photo === 'string') {
    firstImg = rec.photo;
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
    id: String(row.id),
    name,
    make,
    model,
    year,
    priceUsd,
    isSold,
    photoUrl,
    createdAt,
    monthlyPayment: rec.monthlyPayment || rec.paymentPerMonth || null,
    mileage: Number.isFinite(mileage as number) ? mileage : null,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeSold = searchParams.get('includeSold') === '1';
    const id = searchParams.get('id');

    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || "postgresql://neondb_owner:npg_j7eSMifBFtd3@ep-curly-brook-ascm3kjp-pooler.c-4.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

    const sql = neon(connectionString);

    const rows = id
      ? await sql`SELECT id, data, created_at FROM cars WHERE id = ${id} LIMIT 1`
      : await sql`SELECT id, data, created_at FROM cars ORDER BY created_at DESC`;

    const mapped = rows.map((row) => mapCar(row as { id: string; data: unknown; created_at?: unknown }));

    const cars = (includeSold || id)
      ? mapped
      : mapped.filter((c) => !c.isSold && c.priceUsd > 0);

    cars.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({
      success: true,
      total: cars.length,
      cars,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch catalog cars';
    console.error('Error fetching catalog cars from Neon:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
