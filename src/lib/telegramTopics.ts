export const TG_TOPIC_KEYS = [
  "site",
  "instagram",
  "tiktok",
  "crm",
  "ads",
  "service",
] as const;

export type TgTopicKey = (typeof TG_TOPIC_KEYS)[number];

export type TgTopic = {
  key: TgTopicKey;
  name: string;
  hint: string;
  iconColor: number;
};

export const TG_TOPICS: Record<TgTopicKey, TgTopic> = {
  site: {
    key: "site",
    name: "Заявки сайт",
    hint: "формы с belautocenter.by: кредит, лизинг, бронь, комиссия, гарантия, обратный звонок",
    iconColor: 7322096,
  },
  instagram: {
    key: "instagram",
    name: "Лиды Instagram",
    hint: "Instagram и Meta Lead Ads",
    iconColor: 16749490,
  },
  tiktok: {
    key: "tiktok",
    name: "Лиды TikTok",
    hint: "TikTok Lead Ads",
    iconColor: 16766590,
  },
  crm: {
    key: "crm",
    name: "CRM",
    hint: "напоминания о следующем шаге по лиду",
    iconColor: 13338331,
  },
  ads: {
    key: "ads",
    name: "Реклама TikTok",
    hint: "ротация кампаний и «Отснято»",
    iconColor: 16478047,
  },
  service: {
    key: "service",
    name: "Служебные",
    hint: "выкладка av.by / Куфар / Onliner / ABW, посты Threads / Instagram / Facebook, новый авто в каталоге",
    iconColor: 7322096,
  },
};

export function topicForLeadSource(source: string | undefined | null): TgTopicKey | null {
  const s = String(source || "").toLowerCase();
  if (s === "site") return "site";
  if (s === "instagram" || s === "meta" || s === "facebook") return "instagram";
  if (s === "tiktok") return "tiktok";
  return null;
}

export type TelegramTopicStore = {
  botToken?: string;
  chatId?: string;
  forumChatId?: string;
  isForum?: boolean;
  chatType?: string;
  chatTitle?: string;
  topics?: Partial<Record<TgTopicKey, number>>;
  inspectedAt?: string;
};
