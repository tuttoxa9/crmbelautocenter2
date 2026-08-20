import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { calculateDaysInAd, getPriceTierLabel } from '@/lib/services/adsService';

export async function POST(request: Request) {
  try {
    let customBotToken = "";
    let customChatId = "";

    try {
      const body = await request.json();
      if (body?.botToken) customBotToken = String(body.botToken).trim();
      if (body?.chatId) customChatId = String(body.chatId).trim();
    } catch {
      // Empty body is okay
    }

    let botToken = customBotToken;
    let chatId = customChatId;

    if (!botToken || !chatId) {
      try {
        const settingsRows = await sql`
          SELECT id, data FROM settings WHERE id IN ('ads', 'telegram')
        `;

        for (const row of settingsRows) {
          const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          if (!botToken && d?.botToken) botToken = d.botToken;
          if (!chatId && d?.chatId) chatId = d.chatId;
        }
      } catch (err) {
        console.warn("Could not load settings from Neon DB:", err);
      }
    }

    botToken = botToken || "7969988440:AAEqIdBJZVZJ-pco6otAJAkSv2XiTEsi1Z4";
    chatId = chatId || "-1002721193947";

    // Получаем реальный автомобиль из вашей базы рекламы или со склада
    let realCar: any = null;
    try {
      const adCarRows = await sql`SELECT id, data FROM ad_cars LIMIT 1`;
      if (adCarRows.length > 0) {
        const raw = adCarRows[0].data;
        realCar = typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
      if (!realCar) {
        const catalogRows = await sql`SELECT id, name, price, year FROM cars LIMIT 1`;
        if (catalogRows.length > 0) {
          realCar = {
            name: catalogRows[0].name,
            year: catalogRows[0].year,
            priceUsd: catalogRows[0].price,
            campaign: 'rk1',
          };
        }
      }
    } catch (dbErr) {
      console.warn("Could not fetch car from DB for test message:", dbErr);
    }

    const carName = realCar?.name || "Автомобиль из каталога";
    const carYear = realCar?.year ? ` ${realCar.year} г.` : "";
    const carPrice = realCar?.priceUsd ? ` — $${Number(realCar.priceUsd).toLocaleString('ru-RU')}` : "";
    const tierLabel = realCar?.priceTier ? getPriceTierLabel(realCar.priceTier) : "TikTok Реклама";
    const currentCamp = realCar?.campaign === "rk2" ? "РК 2" : "РК 1";
    const targetCamp = currentCamp === "РК 1" ? "РК 2" : "РК 1";
    const daysInAd = realCar?.startedAt ? calculateDaysInAd(realCar.startedAt) : 14;

    const message = [
      `🔄 <b>ТЕСТ РОТАЦИИ РЕКЛАМЫ (TikTok)</b>\n`,
      `🚗 <b>Автомобиль:</b> ${carName}${carYear}${carPrice}`,
      `🎯 <b>Категория:</b> ${tierLabel}`,
      `⏱ <b>Срок:</b> ${daysInAd}-й день в <b>${currentCamp}</b>\n`,
      `⚠️ <b>Действие:</b> Перенести авто из <b>${currentCamp}</b> в <b>${targetCamp}</b>\n`,
      `<i>(Тестовая проверка связи с ботом)</i>`
    ].join('\n');

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

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return NextResponse.json(
        { success: false, error: data.description || "Ошибка Telegram API" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Тестовое уведомление успешно отправлено в Telegram!",
    });
  } catch (error: any) {
    console.error("Error sending test telegram ad alert:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка отправки в Telegram" },
      { status: 500 }
    );
  }
}
