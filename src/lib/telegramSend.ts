import { adminDb } from "./firebaseAdmin";
import { sql } from "./db";
import { TG_TOPICS, TG_TOPIC_KEYS, type TelegramTopicStore, type TgTopicKey } from "./telegramTopics";

const DEFAULT_BOT_TOKEN = "7969988440:AAEqIdBJZVZJ-pco6otAJAkSv2XiTEsi1Z4";
const DEFAULT_CHAT_ID = "-1002721193947";

type TgApiResult = {
  ok: boolean;
  description?: string;
  result?: Record<string, unknown>;
};

const creating = new Map<string, Promise<number | undefined>>();

async function tgApi(token: string, method: string, body: Record<string, unknown>): Promise<TgApiResult> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as TgApiResult;
  if (!data || typeof data !== "object") return { ok: false, description: "Telegram не ответил" };
  return data;
}

function asStore(raw: unknown): TelegramTopicStore {
  if (!raw || typeof raw !== "object") return {};
  const rec = raw as Record<string, unknown>;
  const topics: TelegramTopicStore["topics"] = {};
  if (rec.topics && typeof rec.topics === "object") {
    for (const key of TG_TOPIC_KEYS) {
      const value = Number((rec.topics as Record<string, unknown>)[key]);
      if (Number.isFinite(value) && value > 0) topics[key] = value;
    }
  }
  return {
    botToken: typeof rec.botToken === "string" ? rec.botToken : undefined,
    chatId: typeof rec.chatId === "string" ? rec.chatId : undefined,
    forumChatId: typeof rec.forumChatId === "string" ? rec.forumChatId : undefined,
    isForum: typeof rec.isForum === "boolean" ? rec.isForum : undefined,
    chatType: typeof rec.chatType === "string" ? rec.chatType : undefined,
    chatTitle: typeof rec.chatTitle === "string" ? rec.chatTitle : undefined,
    topics,
    inspectedAt: typeof rec.inspectedAt === "string" ? rec.inspectedAt : undefined,
  };
}

async function loadNeonStore(): Promise<TelegramTopicStore> {
  try {
    const rows = await sql`SELECT data FROM settings WHERE id = 'telegram'`;
    if (!rows.length) return {};
    const data = typeof rows[0].data === "string" ? JSON.parse(String(rows[0].data)) : rows[0].data;
    return asStore(data);
  } catch {
    return {};
  }
}

async function loadFirestoreStore(): Promise<TelegramTopicStore> {
  try {
    if (!adminDb) return {};
    const snap = await adminDb.collection("settings").doc("telegram").get();
    return asStore(snap.data());
  } catch {
    return {};
  }
}

export async function loadTelegramStore(): Promise<TelegramTopicStore> {
  const [fire, neon] = await Promise.all([loadFirestoreStore(), loadNeonStore()]);
  return {
    botToken: fire.botToken || neon.botToken,
    chatId: fire.chatId || neon.chatId,
    forumChatId: fire.forumChatId || neon.forumChatId,
    isForum: fire.isForum ?? neon.isForum,
    chatType: fire.chatType || neon.chatType,
    chatTitle: fire.chatTitle || neon.chatTitle,
    topics: { ...(neon.topics || {}), ...(fire.topics || {}) },
    inspectedAt: fire.inspectedAt || neon.inspectedAt,
  };
}

export async function saveTelegramStore(patch: TelegramTopicStore & { replaceTopics?: boolean }): Promise<TelegramTopicStore> {
  const current = await loadTelegramStore();
  const chatChanged = Boolean(patch.chatId && current.chatId && patch.chatId !== current.chatId);
  const next: TelegramTopicStore = {
    ...current,
    ...patch,
    topics: patch.replaceTopics || chatChanged
      ? { ...(patch.topics || {}) }
      : { ...(current.topics || {}), ...(patch.topics || {}) },
  };
  delete (next as { replaceTopics?: boolean }).replaceTopics;
  const payload: Record<string, unknown> = {
    forumChatId: next.forumChatId || "",
    isForum: Boolean(next.isForum),
    chatType: next.chatType || "",
    chatTitle: next.chatTitle || "",
    topics: next.topics || {},
    inspectedAt: next.inspectedAt || "",
  };
  if (patch.chatId) payload.chatId = patch.chatId;
  if (patch.botToken) payload.botToken = patch.botToken;
  try {
    if (adminDb) {
      await adminDb.collection("settings").doc("telegram").set(payload, { merge: true });
    }
  } catch (error) {
    console.error("telegram firestore store save error", error);
  }
  try {
    const existing = await sql`SELECT data FROM settings WHERE id = 'telegram'`;
    let currentData: Record<string, unknown> = {};
    if (existing.length) {
      const raw = existing[0].data;
      currentData = typeof raw === "string" ? JSON.parse(String(raw)) : ((raw as Record<string, unknown>) || {});
    }
    const merged: Record<string, unknown> = { ...currentData, ...payload };
    await sql`
      INSERT INTO settings (id, data, created_at)
      VALUES ('telegram', ${JSON.stringify(merged)}, ${Date.now()})
      ON CONFLICT (id)
      DO UPDATE SET data = ${JSON.stringify(merged)}
    `;
  } catch (error) {
    console.error("telegram neon store save error", error);
  }
  return next;
}

export type ChatInspect = {
  ok: boolean;
  error?: string;
  chatId: string;
  type?: string;
  title?: string;
  isForum: boolean;
  forumChatId: string;
  linkedChatId?: number;
};

export async function inspectTelegramChat(token: string, chatId: string): Promise<ChatInspect> {
  const chat = await tgApi(token, "getChat", { chat_id: chatId });
  if (!chat.ok || !chat.result) {
    return { ok: false, error: chat.description || "не удалось прочитать чат", chatId, isForum: false, forumChatId: chatId };
  }
  const type = String(chat.result.type || "");
  const title = String(chat.result.title || "");
  const linked = Number(chat.result.linked_chat_id);
  const selfForum = type === "supergroup" && Boolean(chat.result.is_forum);
  if (selfForum) {
    return { ok: true, chatId, type, title, isForum: true, forumChatId: chatId, linkedChatId: Number.isFinite(linked) ? linked : undefined };
  }
  if (type === "channel" && Number.isFinite(linked) && linked) {
    const linkedChat = await tgApi(token, "getChat", { chat_id: linked });
    const linkedForum = Boolean(linkedChat.result?.is_forum) && String(linkedChat.result?.type) === "supergroup";
    if (linkedForum) {
      return {
        ok: true,
        chatId,
        type,
        title,
        isForum: true,
        forumChatId: String(linked),
        linkedChatId: linked,
      };
    }
  }
  return {
    ok: true,
    chatId,
    type,
    title,
    isForum: false,
    forumChatId: chatId,
    linkedChatId: Number.isFinite(linked) ? linked : undefined,
  };
}

async function createTopic(token: string, forumChatId: string, key: TgTopicKey): Promise<number | undefined> {
  const topic = TG_TOPICS[key];
  const lockKey = `${forumChatId}:${key}`;
  const pending = creating.get(lockKey);
  if (pending) return pending;
  const run = (async () => {
    const created = await tgApi(token, "createForumTopic", {
      chat_id: forumChatId,
      name: topic.name,
      icon_color: topic.iconColor,
    });
    const threadId = Number(created.result?.message_thread_id);
    if (!created.ok || !Number.isFinite(threadId) || threadId <= 0) {
      console.error("createForumTopic failed", key, created.description);
      return undefined;
    }
    return threadId;
  })();
  creating.set(lockKey, run);
  try {
    return await run;
  } finally {
    creating.delete(lockKey);
  }
}

export async function ensureTelegramTopics(opts: {
  token: string;
  chatId: string;
}): Promise<{ inspect: ChatInspect; topics: Partial<Record<TgTopicKey, number>>; created: TgTopicKey[] }> {
  const inspect = await inspectTelegramChat(opts.token, opts.chatId);
  const store = await loadTelegramStore();
  const sameForum = inspect.ok && store.forumChatId === inspect.forumChatId;
  const topics: Partial<Record<TgTopicKey, number>> = {};
  if (sameForum) {
    for (const key of TG_TOPIC_KEYS) {
      if (store.topics?.[key]) topics[key] = store.topics[key];
    }
  }
  const created: TgTopicKey[] = [];
  if (!inspect.ok) return { inspect, topics, created };
  if (inspect.isForum) {
    for (const key of TG_TOPIC_KEYS) {
      if (topics[key]) continue;
      const threadId = await createTopic(opts.token, inspect.forumChatId, key);
      if (threadId) {
        topics[key] = threadId;
        created.push(key);
      }
    }
  }
  await saveTelegramStore({
    chatId: opts.chatId,
    forumChatId: inspect.forumChatId,
    isForum: inspect.isForum,
    chatType: inspect.type,
    chatTitle: inspect.title,
    topics,
    inspectedAt: new Date().toISOString(),
    replaceTopics: true,
  });
  return { inspect, topics, created };
}

function withTopicPrefix(text: string, key: TgTopicKey): string {
  const name = TG_TOPICS[key].name;
  if (text.includes(name)) return text;
  return `<b>${name}</b>\n${text}`;
}

export type TelegramCreds = {
  botToken: string;
  chatId: string;
  isActive: boolean;
};

export async function loadTelegramCreds(): Promise<TelegramCreds> {
  const store = await loadTelegramStore();
  return {
    botToken: (store.botToken || DEFAULT_BOT_TOKEN).trim(),
    chatId: (store.chatId || DEFAULT_CHAT_ID).trim(),
    isActive: true,
  };
}

export async function sendTelegramMessage(opts: {
  text: string;
  topic?: TgTopicKey | null;
  token?: string;
  chatId?: string;
  parseMode?: "HTML";
}): Promise<{ ok: boolean; error?: string; via: "topic" | "prefix" }> {
  const store = await loadTelegramStore();
  const token = (opts.token || store.botToken || DEFAULT_BOT_TOKEN).trim();
  const chatId = (opts.chatId || store.chatId || DEFAULT_CHAT_ID).trim();
  if (!token || !chatId) return { ok: false, error: "не настроен Telegram", via: "prefix" };

  if (!opts.topic) {
    const sent = await tgApi(token, "sendMessage", {
      chat_id: chatId,
      text: opts.text,
      parse_mode: opts.parseMode || "HTML",
    });
    if (!sent.ok) return { ok: false, error: sent.description || "Telegram не принял", via: "prefix" };
    return { ok: true, via: "prefix" };
  }

  let inspect: ChatInspect | null = null;
  const stale = !store.inspectedAt || Date.parse(store.inspectedAt) < Date.now() - 6 * 60 * 60 * 1000;
  if (stale || store.isForum === undefined || !store.forumChatId) {
    inspect = await inspectTelegramChat(token, chatId);
    if (inspect.ok) {
      await saveTelegramStore({
        chatId,
        forumChatId: inspect.forumChatId,
        isForum: inspect.isForum,
        chatType: inspect.type,
        chatTitle: inspect.title,
        inspectedAt: new Date().toISOString(),
      });
    }
  }

  const isForum = inspect?.isForum ?? store.isForum === true;
  const forumChatId = inspect?.forumChatId || store.forumChatId || chatId;
  let threadId = isForum ? store.topics?.[opts.topic] : undefined;
  let via: "topic" | "prefix" = "prefix";
  let text = opts.text;

  if (isForum) {
    if (!threadId) {
      threadId = await createTopic(token, forumChatId, opts.topic);
      if (threadId) {
        await saveTelegramStore({
          topics: { [opts.topic]: threadId },
          forumChatId,
          isForum: true,
        });
      }
    }
    if (threadId) via = "topic";
    else text = withTopicPrefix(text, opts.topic);
  } else {
    text = withTopicPrefix(text, opts.topic);
  }

  const payload: Record<string, unknown> = {
    chat_id: via === "topic" ? forumChatId : chatId,
    text,
    parse_mode: opts.parseMode || "HTML",
  };
  if (via === "topic" && threadId) payload.message_thread_id = threadId;

  let sent = await tgApi(token, "sendMessage", payload);
  if (!sent.ok && via === "topic") {
    sent = await tgApi(token, "sendMessage", {
      chat_id: chatId,
      text: withTopicPrefix(opts.text, opts.topic),
      parse_mode: opts.parseMode || "HTML",
    });
    via = "prefix";
    const nextTopics = { ...(store.topics || {}) };
    delete nextTopics[opts.topic];
    await saveTelegramStore({ topics: nextTopics, replaceTopics: true });
  }

  if (!sent.ok) return { ok: false, error: sent.description || "Telegram не принял", via };
  return { ok: true, via };
}
