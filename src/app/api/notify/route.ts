import { NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/lib/telegram';
import { verifyFirebaseIdToken } from '@/lib/verifyToken';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    
    try {
      // Верификация пользователя через Firebase Auth
      await verifyFirebaseIdToken(token);
    } catch (err: any) {
      console.error("Token verification failed:", err);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, car, source, notes } = body;

    // Отправка уведомления в Telegram
    await sendTelegramNotification({ name, phone, car, source, notes });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in api/notify route:", error);
    return NextResponse.json({ error: error.message || "Failed to send notification" }, { status: 500 });
  }
}
