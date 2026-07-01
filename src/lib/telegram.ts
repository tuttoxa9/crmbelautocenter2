import { adminDb } from './firebaseAdmin';

interface LeadNotificationData {
  name: string;
  phone: string;
  car?: string;
  source: string;
  notes?: string;
}

export async function sendTelegramNotification(lead: LeadNotificationData) {
  try {
    if (!adminDb) {
      console.warn("Firebase Admin is not initialized. Skipping Telegram notification.");
      return;
    }

    // Получаем настройки телеграма из Firestore
    const settingsDoc = await adminDb.collection('settings').doc('telegram').get();
    const telegramSettings = settingsDoc.data();

    // Дефолтные настройки, если в базе ничего нет
    const botToken = telegramSettings?.botToken ?? "7969988440:AAEqIdBJZVZJ-pco6otAJAkSv2XiTEsi1Z4";
    const chatId = telegramSettings?.chatId ?? "-1002721193947";
    const isActive = telegramSettings?.isActive !== undefined ? telegramSettings.isActive : true;

    if (!isActive) {
      console.log("Telegram notifications are disabled in settings.");
      return;
    }

    if (!botToken || !chatId) {
      console.warn("Telegram botToken or chatId is missing. Skipping notification.");
      return;
    }

    // Сопоставление источников с эмодзи для красивого отображения
    const sourceEmojiMap: Record<string, string> = {
      site: "Сайт 🌐",
      instagram: "Instagram 📸",
      tiktok: "TikTok 🎵",
      call: "Звонок 📞",
      telegram: "Telegram 💬",
      kufar: "Kufar 🏢",
      walk_in: "С улицы 🚶‍♂️",
      zapier: "Zapier ⚡"
    };

    const formattedSource = sourceEmojiMap[lead.source.toLowerCase()] || lead.source;

    const message = [
      `🔔 <b>Новый лид!</b>\n`,
      `👤 <b>Имя:</b> ${lead.name || 'Не указано'}`,
      `📞 <b>Телефон:</b> <code>${lead.phone || 'Не указано'}</code>`,
      lead.car ? `🚗 <b>Автомобиль:</b> ${lead.car}` : null,
      `📢 <b>Источник:</b> ${formattedSource}`,
      lead.notes ? `📝 <b>Заметка:</b> ${lead.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send Telegram notification:", errorData);
    } else {
      console.log("Telegram notification sent successfully.");
    }
  } catch (error) {
    console.error("Error in sendTelegramNotification:", error);
  }
}

export async function sendTelegramReminder(lead: any, minutesLeft: number) {
  try {
    if (!adminDb) {
      console.warn("Firebase Admin is not initialized. Skipping Telegram reminder.");
      return;
    }

    const settingsDoc = await adminDb.collection('settings').doc('telegram').get();
    const telegramSettings = settingsDoc.data();

    const botToken = telegramSettings?.botToken ?? "7969988440:AAEqIdBJZVZJ-pco6otAJAkSv2XiTEsi1Z4";
    const chatId = telegramSettings?.chatId ?? "-1002721193947";
    const isActive = telegramSettings?.isActive !== undefined ? telegramSettings.isActive : true;

    if (!isActive) {
      return;
    }

    if (!botToken || !chatId) {
      return;
    }

    // Форматируем статус для красивого отображения
    const statusNameMap: Record<string, string> = {
      new: "Новый 🆕",
      in_progress: "В работе ⚙️",
      visit: "Приезд 🚗",
      refusal: "Отказ ❌",
      bank_refusal: "Отказ банка 🏦❌",
      success: "Оформился/купил 🎉",
      no_answer: "Недозвон 📞🔇",
      spam: "Брак/Тест 🗑️",
      thinking: "Думает 🤔",
      callback: "Перезвонить 📞"
    };

    const formattedStatus = statusNameMap[lead.status] || lead.status;

    // Время следующего действия в читаемом виде (Минск/Москва, UTC+3)
    const eventTime = new Date(lead.nextActionDate).toLocaleTimeString("ru-RU", {
      timeZone: "Europe/Minsk",
      hour: "2-digit",
      minute: "2-digit"
    });

    const message = [
      `⏰ <b>Напоминание о задаче!</b>\n`,
      `👤 <b>Имя:</b> ${lead.name || 'Не указано'}`,
      `📞 <b>Телефон:</b> <code>${lead.phone || 'Не указано'}</code>`,
      lead.car ? `🚗 <b>Автомобиль:</b> ${lead.car}` : null,
      lead.notes ? `📝 <b>Заметка:</b> ${lead.notes}` : null,
      `\n⏳ <b>Запланировано через ${minutesLeft} мин. (в ${eventTime}) со статусом: "${formattedStatus}"</b>`
    ]
      .filter(Boolean)
      .join('\n');

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send Telegram reminder:", errorData);
    } else {
      console.log(`Telegram reminder for lead ${lead.id || lead.phone} sent successfully.`);
    }
  } catch (error) {
    console.error("Error in sendTelegramReminder:", error);
  }
}
