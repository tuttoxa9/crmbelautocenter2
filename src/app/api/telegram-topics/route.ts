import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/verifyToken";
import { ensureTelegramTopics, inspectTelegramChat, sendTelegramMessage } from "@/lib/telegramSend";
import { TG_TOPIC_KEYS, TG_TOPICS } from "@/lib/telegramTopics";

async function requireUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  try {
    await verifyFirebaseIdToken(authHeader.split("Bearer ")[1]);
    return { error: null };
  } catch {
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const botToken = String(body?.botToken || "").trim();
    const chatId = String(body?.chatId || "").trim();
    const action = String(body?.action || "inspect");

    if (!botToken || !chatId) {
      return NextResponse.json({ error: "Нужны токен бота и Chat ID" }, { status: 400 });
    }

    if (action === "inspect") {
      const inspect = await inspectTelegramChat(botToken, chatId);
      return NextResponse.json({ success: inspect.ok, inspect });
    }

    if (action === "ensure") {
      const result = await ensureTelegramTopics({ token: botToken, chatId });
      return NextResponse.json({
        success: result.inspect.ok,
        inspect: result.inspect,
        topics: result.topics,
        created: result.created,
        error: result.inspect.ok
          ? result.inspect.isForum
            ? undefined
            : "Это канал, не группа с темами. Пока сообщения уходят с пометкой темы в тексте."
          : result.inspect.error,
      });
    }

    if (action === "test") {
      const ensured = await ensureTelegramTopics({ token: botToken, chatId });
      const results: Record<string, { ok: boolean; error?: string; via?: string }> = {};
      for (const key of TG_TOPIC_KEYS) {
        const sent = await sendTelegramMessage({
          token: botToken,
          chatId,
          topic: key,
          text: `🔔 <b>Тест темы «${TG_TOPICS[key].name}»</b>\nСюда будут приходить: ${TG_TOPICS[key].hint}`,
        });
        results[key] = { ok: sent.ok, error: sent.error, via: sent.via };
      }
      return NextResponse.json({
        success: true,
        inspect: ensured.inspect,
        topics: ensured.topics,
        results,
      });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (error: any) {
    console.error("telegram-topics", error);
    return NextResponse.json({ error: error.message || "Ошибка Telegram" }, { status: 500 });
  }
}
