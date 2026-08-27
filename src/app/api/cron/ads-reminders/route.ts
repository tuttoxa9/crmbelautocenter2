import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendTelegramAdRotationAlert } from '@/lib/telegram';
import { getPriceTierLabel, getMinskDateKey, getCalendarDaysLeft } from '@/lib/services/adsService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isForce = searchParams.get('force') === 'true';

    const authHeader = request.headers.get('authorization');
    const isCronSecretMatch = process.env.CRON_SECRET
      ? authHeader === `Bearer ${process.env.CRON_SECRET}`
      : true;

    const isVercelCron = request.headers.get('x-vercel-cron') === 'true';

    if (process.env.NODE_ENV === 'production' && !isCronSecretMatch && !isVercelCron && !isForce) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settingsRows = await sql`
      SELECT data FROM settings WHERE id = 'ads' LIMIT 1
    `;
    let adsSettings: any = {};
    if (settingsRows.length > 0) {
      const raw = settingsRows[0].data;
      adsSettings = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }

    const isActive = adsSettings?.isActive !== undefined ? adsSettings.isActive : true;

    if (!isActive && !isForce) {
      return NextResponse.json({ success: true, message: 'Ads notifications are inactive in settings.' });
    }

    const carRows = await sql`
      SELECT id, data FROM ad_cars
    `;

    const cars = carRows.map((r: any) => {
      const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      return { id: r.id, ...d };
    }).filter((c: any) => c.campaign === 'rk1' || c.campaign === 'rk2');

    const now = Date.now();
    const todayKey = getMinskDateKey(now);

    let alertsSent = 0;
    const expiredList = [];

    for (const car of cars) {
      const daysLeft = getCalendarDaysLeft(car.targetRotationDate, car.startedAt, car.maxDays);
      const isDue = daysLeft <= 0;

      if (isDue) {
        const campaign = car.campaign as 'rk1' | 'rk2';
        const targetCampaign = campaign === 'rk1' ? 'rk2' : 'rk1';
        const lastAlert = Number(car.lastAlertSentAt) || 0;
        const timeSinceLastAlert = now - lastAlert;
        const canSendAlert = isForce || timeSinceLastAlert > 20 * 60 * 60 * 1000;
        const daysInAd = Math.max(0, Math.floor((now - (Number(car.startedAt) || now)) / 86400000));

        expiredList.push({
          id: car.id,
          name: car.name,
          campaign,
          daysInAd,
          daysLeft,
          todayKey,
          alertSent: canSendAlert,
        });

        if (canSendAlert) {
          const priceTierLabel = getPriceTierLabel(car.priceTier);

          await sendTelegramAdRotationAlert({
            name: car.name,
            year: car.year,
            priceUsd: car.priceUsd,
            priceTierLabel,
            currentCampaign: campaign,
            targetCampaign,
            daysInAd,
            photoUrl: car.photoUrl,
          });

          const updatedData = {
            ...car,
            lastAlertSentAt: now,
            updatedAt: now,
          };
          delete updatedData.id;

          await sql`
            UPDATE ad_cars 
            SET data = ${JSON.stringify(updatedData)}, updated_at = ${new Date().toISOString()}
            WHERE id = ${car.id}
          `;

          alertsSent++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      todayKey,
      totalActiveCars: cars.length,
      expiredCarsCount: expiredList.length,
      alertsSent,
      expiredList,
    });
  } catch (error: any) {
    console.error('Error in ads-reminders cron route with Neon DB:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process ad reminders' },
      { status: 500 }
    );
  }
}
