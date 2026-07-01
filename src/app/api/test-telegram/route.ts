import { NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/verifyToken';

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

    const message = `🔔 <b>Тест связи Белавтоцентр CRM</b>\n\nИнтеграция с Telegram настроена успешно!`;

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
      return NextResponse.json({ 
        success: false, 
        error: data.description || "Не удалось отправить сообщение через Telegram API" 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in api/test-telegram route:", error);
    return NextResponse.json({ error: error.message || "Ошибка отправки тестового сообщения" }, { status: 500 });
  }
}
