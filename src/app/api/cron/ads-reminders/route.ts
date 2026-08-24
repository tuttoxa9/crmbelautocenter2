import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
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

    // 2. Получаем настройки Ads из Neon DB
    const settingsRows = await sql`
      SELECT data FROM settings WHERE id = 'ads' LIMIT 1
    `;
    let adsSettings: any = {};
    if (settingsRows.length > 0) {
      const raw = settingsRows[0].data;
      adsSettings = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }

    const rk1DaysLimit = Number(adsSettings?.rk1Days) || 17;
    const rk2DaysLimit = Number(adsSettings?.rk2Days) || 14;
    const targetPerDay = Number(adsSettings?.targetCarsPerDay) || 3;
    const isActive = adsSettings?.isActive !== undefined ? adsSettings.isActive : true;

    if (!isActive && !isForce) {
      return NextResponse.json({ success: true, message: 'Ads notifications are inactive in settings.' });
    }

    // 3. Get total catalog cars count for reference
    const catalogCountRows = await sql`
      SELECT COUNT(*) as count FROM cars
    `;
    const totalCatalogCars = Number(catalogCountRows[0]?.count) || 300;

    // 4. Получаем все активные авто из таблицы ad_cars в Neon DB
    const carRows = await sql`
      SELECT id, data FROM ad_cars
    `;

    const cars = carRows.map((r: any) => {
      const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      return { id: r.id, ...d };
    }).filter((c: any) => c.campaign === 'rk1' || c.campaign === 'rk2');

    const now = Date.now();
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayMidnightMs = todayMidnight.getTime();

    let alertsSent = 0;
    const expiredList = [];

    for (const car of cars) {
      const startedAt = Number(car.startedAt) || now;
      const diffMs = now - startedAt;
      const daysInAd = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      const campaign = car.campaign as 'rk1' | 'rk2';
      const limitDays = Number(car.maxDays) || 14;

      // Проверяем, наступил ли срок ротации по календарной дате или дням
      const targetRotationDate = Number(car.targetRotationDate);
      const isDue = targetRotationDate 
        ? targetRotationDate <= todayMidnightMs 
        : daysInAd >= limitDays;

      if (isDue) {
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

          // Обновляем метку времени последнего алерта в Neon DB
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
