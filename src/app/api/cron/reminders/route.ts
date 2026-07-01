import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendTelegramReminder } from '@/lib/telegram';

export async function GET(request: Request) {
  try {
    // 1. Проверяем авторизацию Cron-задачи (Vercel передает специальный секрет в заголовках)
    const authHeader = request.headers.get('authorization');
    const isCronSecretMatch = process.env.CRON_SECRET 
      ? authHeader === `Bearer ${process.env.CRON_SECRET}`
      : true; // Если секрет не настроен, разрешаем вызов (для локального тестирования)

    // Vercel также передает заголовок x-vercel-cron при системном вызове
    const isVercelCron = request.headers.get('x-vercel-cron') === 'true';

    // Для локального тестирования разрешаем вызов, если нет жесткого ограничения
    if (process.env.NODE_ENV === 'production' && !isCronSecretMatch && !isVercelCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    // 2. Получаем настройки Telegram
    const settingsDoc = await adminDb.collection('settings').doc('telegram').get();
    const settings = settingsDoc.data();

    if (!settings || !settings.isActive) {
      return NextResponse.json({ success: true, message: 'Telegram notifications are inactive or not configured' });
    }

    const reminderRules = settings.reminderRules || {};
    const activeStatusesWithRules = Object.keys(reminderRules).filter(status => reminderRules[status] > 0);

    if (activeStatusesWithRules.length === 0) {
      return NextResponse.json({ success: true, message: 'No reminder rules configured' });
    }

    // 3. Выбираем лиды с запланированным будущим временем следующего шага
    const now = Date.now();
    const leadsSnapshot = await adminDb.collection('leads')
      .where('nextActionDate', '>', now)
      .get();

    const leads = leadsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    console.log(`Checking ${leads.length} scheduled leads for reminders...`);

    let sentCount = 0;

    for (const lead of leads) {
      const status = lead.status;
      const ruleMinutes = reminderRules[status];

      // Проверяем, есть ли правило для этого статуса
      if (!ruleMinutes || ruleMinutes <= 0) continue;

      const nextAction = lead.nextActionDate;
      const differenceMs = nextAction - now;
      const ruleMs = ruleMinutes * 60 * 1000;

      // Напоминаем, если до события осталось меньше или равно ruleMinutes
      const isTimeForReminder = differenceMs <= ruleMs;

      // Защита от дубликатов: напоминание для этой конкретной даты еще не отправлялось
      const isAlreadySent = lead.reminderSentForDate === nextAction;

      if (isTimeForReminder && !isAlreadySent) {
        // Вычисляем, сколько минут осталось (примерно)
        const minutesLeft = Math.max(1, Math.round(differenceMs / 1000 / 60));

        // Отправляем уведомление
        await sendTelegramReminder(lead, minutesLeft);

        // Обновляем флаг отправки напоминания в Firestore
        await adminDb.collection('leads').doc(lead.id).update({
          reminderSentForDate: nextAction
        });

        sentCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed. Sent ${sentCount} reminders.`
    });
  } catch (error: any) {
    console.error('Error in reminders cron route:', error);
    return NextResponse.json({ error: error.message || 'Failed to process reminders' }, { status: 500 });
  }
}
