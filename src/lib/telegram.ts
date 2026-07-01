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
      `📞 <b>Телефон:</b> ${lead.phone || 'Не указано'}`,
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
