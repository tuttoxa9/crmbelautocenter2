import { NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/verifyToken';
import { sendTelegramMessage } from '@/lib/telegramSend';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    
    try {
      await verifyFirebaseIdToken(token);
    } catch (err) {
      console.error("Token verification failed in test-telegram:", err);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { botToken, chatId } = body;

    if (!botToken || !chatId) {
      return NextResponse.json({ error: "Необходимы Bot Token и Chat ID" }, { status: 400 });
    }

    const sent = await sendTelegramMessage({
      token: botToken,
      chatId,
      topic: "service",
      text: `🔔 <b>Тест связи Белавтоцентр CRM</b>\n\nИнтеграция с Telegram настроена успешно!`,
    });

    if (!sent.ok) {
      return NextResponse.json({ 
        success: false, 
        error: sent.error || "Не удалось отправить сообщение через Telegram API" 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, via: sent.via });
  } catch (error: any) {
    console.error("Error in api/test-telegram route:", error);
    return NextResponse.json({ error: error.message || "Ошибка отправки тестового сообщения" }, { status: 500 });
  }
}
