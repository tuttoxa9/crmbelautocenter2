import { adminDb } from './firebaseAdmin';
import { sendTelegramMessage } from './telegramSend';
import { topicForLeadSource, type TgTopicKey } from './telegramTopics';

interface LeadNotificationData {
  name: string;
  phone: string;
  car?: string;
  source: string;
  notes?: string;
}

type TelegramFlags = {
  botToken: string;
  chatId: string;
  isActive: boolean;
};

const DEFAULT_BOT_TOKEN = "7969988440:AAEqIdBJZVZJ-pco6otAJAkSv2XiTEsi1Z4";
const DEFAULT_CHAT_ID = "-1002721193947";

async function loadLeadFlags(): Promise<TelegramFlags> {
  let botToken = DEFAULT_BOT_TOKEN;
  let chatId = DEFAULT_CHAT_ID;
  let isActive = true;
  try {
    if (adminDb) {
      const settingsDoc = await adminDb.collection('settings').doc('telegram').get();
      const telegramSettings = settingsDoc.data();
      if (telegramSettings?.botToken) botToken = String(telegramSettings.botToken);
      if (telegramSettings?.chatId) chatId = String(telegramSettings.chatId);
      if (telegramSettings?.isActive !== undefined) isActive = Boolean(telegramSettings.isActive);
    }
  } catch (error) {
    console.warn("Could not load telegram settings from Firestore, using defaults:", error);
  }
  return { botToken, chatId, isActive };
}

async function loadAdsFlags(): Promise<TelegramFlags> {
  let botToken = DEFAULT_BOT_TOKEN;
  let chatId = DEFAULT_CHAT_ID;
  let isActive = true;
  try {
    const { sql } = await import('./db');
    const settingsRows = await sql`
      SELECT id, data FROM settings WHERE id IN ('ads', 'telegram')
    `;
    for (const row of settingsRows) {
      const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      if (d?.botToken) botToken = d.botToken;
      if (d?.chatId) chatId = d.chatId;
      if (row.id === 'ads' && d?.isActive !== undefined) {
        isActive = Boolean(d.isActive);
      }
    }
  } catch (dbErr) {
    console.warn("Could not load telegram settings from Neon DB, using defaults:", dbErr);
  }
  try {
    if (adminDb) {
      const settingsDoc = await adminDb.collection('settings').doc('telegram').get();
      const telegramSettings = settingsDoc.data();
      if (telegramSettings?.botToken) botToken = String(telegramSettings.botToken);
      if (telegramSettings?.chatId) chatId = String(telegramSettings.chatId);
    }
  } catch {
    /* neon already filled */
  }
  return { botToken, chatId, isActive };
}

async function deliver(flags: TelegramFlags, text: string, topic: TgTopicKey | null) {
  if (!flags.isActive) {
    console.log("Telegram notifications are disabled in settings.");
    return;
  }
  if (!flags.botToken || !flags.chatId) {
    console.warn("Telegram botToken or chatId is missing. Skipping notification.");
    return;
  }
  const sent = await sendTelegramMessage({
    text,
    topic,
    token: flags.botToken,
    chatId: flags.chatId,
  });
  if (!sent.ok) console.error("Failed to send Telegram notification:", sent.error);
  else console.log("Telegram notification sent successfully.");
}

export async function sendTelegramNotification(lead: LeadNotificationData) {
  try {
    const flags = await loadLeadFlags();
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

    await deliver(flags, message, topicForLeadSource(lead.source));
  } catch (error) {
    console.error("Error in sendTelegramNotification:", error);
  }
}

export async function sendTelegramReminder(lead: any, minutesLeft: number) {
  try {
    const flags = await loadLeadFlags();
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

    await deliver(flags, message, "crm");
  } catch (error) {
    console.error("Error in sendTelegramReminder:", error);
  }
}

export interface AdRotationAlertData {
  name: string;
  year?: string | number;
  priceUsd: number;
  priceTierLabel: string;
  currentCampaign: 'rk1' | 'rk2';
  targetCampaign: 'rk1' | 'rk2';
  daysInAd: number;
  photoUrl?: string;
}

export async function sendTelegramAdRotationAlert(data: AdRotationAlertData) {
  try {
    const flags = await loadAdsFlags();
    const currentCampaignLabel = data.currentCampaign === "rk1" ? "Кампания 1" : "Кампания 2";
    const targetCampaignLabel = data.targetCampaign === "rk1" ? "Кампания 1" : "Кампания 2";

    const formattedPrice = Number(data.priceUsd || 0).toLocaleString('ru-RU');
    const yearStr = data.year ? ` ${data.year} г.` : '';

    const message = [
      `🔄 <b>РОТАЦИЯ РЕКЛАМЫ TikTok</b>\n`,
      `🚗 <b>Автомобиль:</b> ${data.name}${yearStr} — $${formattedPrice}`,
      `🎯 <b>Категория:</b> ${data.priceTierLabel}`,
      `⏱ <b>Срок:</b> ${data.daysInAd}-й день в <b>${currentCampaignLabel}</b>\n`,
      `⚠️ <b>Действие:</b> Перенести авто из <b>${currentCampaignLabel}</b> в <b>${targetCampaignLabel}</b>`
    ].join('\n');

    await deliver(flags, message, "ads");
  } catch (error) {
    console.error("Error in sendTelegramAdRotationAlert:", error);
  }
}

export interface AdShotAlertData {
  name: string;
  year?: string | number;
  priceUsd: number;
  priceTierLabel: string;
  fromCampaign?: "rk1" | "rk2" | string;
  photoUrl?: string;
  shotByName?: string;
}

export async function sendTelegramAdShotAlert(data: AdShotAlertData) {
  try {
    const flags = await loadAdsFlags();
    const from =
      data.fromCampaign === "rk1"
        ? "Кампания 1"
        : data.fromCampaign === "rk2"
          ? "Кампания 2"
          : data.fromCampaign === "waiting_video"
            ? "На съёмку"
            : data.fromCampaign === "ready_for_ads"
              ? "Отснято"
              : data.fromCampaign || "очереди";
    const formattedPrice = Number(data.priceUsd || 0).toLocaleString("ru-RU");
    const yearStr = data.year ? ` ${data.year} г.` : "";

    const message = [
      `🎬 <b>ОТСНЯТО · TikTok</b>\n`,
      `🚗 <b>Автомобиль:</b> ${data.name}${yearStr} — $${formattedPrice}`,
      `🎯 <b>Категория:</b> ${data.priceTierLabel}`,
      `📦 <b>Было:</b> ${from}`,
      `✅ <b>Сейчас:</b> Отснято — можно ставить в рекламу`,
      data.shotByName ? `👤 <b>Кто:</b> ${data.shotByName}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await deliver(flags, message, "ads");
  } catch (error) {
    console.error("Error in sendTelegramAdShotAlert:", error);
  }
}
