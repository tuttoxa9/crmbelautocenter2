import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendTelegramAdRotationAlert } from '@/lib/telegram';
import { getPriceTierLabel } from '@/lib/services/adsService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isForce = searchParams.get('force') === 'true';

    // 1. Проверяем авторизацию Cron-задачи (если в продакшене и не force)
    const authHeader = request.headers.get('authorization');
    const isCronSecretMatch = process.env.CRON_SECRET 
      ? authHeader === `Bearer ${process.env.CRON_SECRET}`
      : true;

    const isVercelCron = request.headers.get('x-vercel-cron') === 'true';

    if (process.env.NODE_ENV === 'production' && !isCronSecretMatch && !isVercelCron && !isForce) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    // 2. Получаем настройки Ads
    const settingsDoc = await adminDb.collection('settings').doc('ads').get();
    const adsSettings = settingsDoc.data() || {};

    const rk1DaysLimit = Number(adsSettings.rk1Days) || 17;
    const rk2DaysLimit = Number(adsSettings.rk2Days) || 14;
    const isActive = adsSettings.isActive !== undefined ? adsSettings.isActive : true;

    if (!isActive && !isForce) {
      return NextResponse.json({ success: true, message: 'Ads notifications are inactive in settings.' });
    }

    // 3. Получаем все активные авто в РК 1 и РК 2
    const carsSnapshot = await adminDb.collection('ad_cars')
      .where('campaign', 'in', ['rk1', 'rk2'])
      .get();

    const cars = carsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    const now = Date.now();
    let alertsSent = 0;
    const expiredList = [];

    for (const car of cars) {
      const startedAt = Number(car.startedAt) || now;
      const diffMs = now - startedAt;
      const daysInAd = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      const campaign = car.campaign as 'rk1' | 'rk2';
      const limitDays = Number(car.maxDays) || (campaign === 'rk1' ? rk1DaysLimit : rk2DaysLimit);

      // Проверяем, наступил ли срок ротации
      if (daysInAd >= limitDays) {
        const targetCampaign = campaign === 'rk1' ? 'rk2' : 'rk1';
        const lastAlert = Number(car.lastAlertSentAt) || 0;
        const timeSinceLastAlert = now - lastAlert;

        // Защита от дублей: отправляем не чаще раза в 20 часов (если не force)
        const canSendAlert = isForce || timeSinceLastAlert > 20 * 60 * 60 * 1000;

        expiredList.push({
          id: car.id,
          name: car.name,
          campaign,
          daysInAd,
          limitDays,
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

          await adminDb.collection('ad_cars').doc(car.id).update({
            lastAlertSentAt: now,
            updatedAt: now,
          });

          alertsSent++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalActiveCars: cars.length,
      expiredCarsCount: expiredList.length,
      alertsSent,
      expiredList,
    });
  } catch (error: any) {
    console.error('Error in ads-reminders cron route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process ad reminders' },
      { status: 500 }
    );
  }
}
