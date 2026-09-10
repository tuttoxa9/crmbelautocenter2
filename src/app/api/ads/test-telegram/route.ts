import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

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

    const message = [
      `✅ <b>Проверка: реклама TikTok</b>\n`,
      `Связь с ботом работает. Сюда будут приходить «Отснято» и напоминания сменить кампанию.`,
    ].join("\n");

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
