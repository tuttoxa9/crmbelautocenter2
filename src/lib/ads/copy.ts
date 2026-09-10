import type { AdCampaignType } from "@/lib/types";

export const ADS_HINTS_KEY = "bac.ads.hints.v1";

export const CAMPAIGN_SHORT: Record<AdCampaignType, string> = {
  rk1: "К1",
  rk2: "К2",
  waiting_video: "Съёмка",
  ready_for_ads: "Отснято",
};

export const CAMPAIGN_LABEL: Record<AdCampaignType, string> = {
  rk1: "Кампания 1",
  rk2: "Кампания 2",
  waiting_video: "На съёмку",
  ready_for_ads: "Отснято",
};

export function campaignLabel(value?: string | null): string {
  if (value === "rk1" || value === "rk2" || value === "waiting_video" || value === "ready_for_ads") {
    return CAMPAIGN_LABEL[value];
  }
  return value || "—";
}

export function campaignShort(value?: string | null): string {
  if (value === "rk1" || value === "rk2" || value === "waiting_video" || value === "ready_for_ads") {
    return CAMPAIGN_SHORT[value];
  }
  return "—";
}

export function otherAir(campaign: string): "rk1" | "rk2" {
  return campaign === "rk1" ? "rk2" : "rk1";
}

export function rotateLabel(from: string): string {
  return from === "rk1" ? "В кампанию 2" : "В кампанию 1";
}

export function carFacts(car: {
  year?: string | number;
  priceUsd?: number;
}): string {
  const bits: string[] = [];
  if (car.year) bits.push(String(car.year));
  const price = Number(car.priceUsd) || 0;
  if (price > 0) bits.push(`$${price.toLocaleString("ru-RU")}`);
  return bits.join(" · ");
}

export const HINTS = [
  {
    title: "Две кампании TikTok",
    text: "К1 и К2 — две рекламы. Ролик не висит вечно: через две–три недели машину перекладываем в другую, чтобы креатив не приелся.",
  },
  {
    title: "Сначала ролик, потом эфир",
    text: "Новую машину ставим «На съёмку». Когда ролик готов — «Отснято». Тогда её можно запускать в кампанию.",
  },
  {
    title: "Сегодня — это список дел",
    text: "Сверху то, что просрочено и что снять. График и все машины в эфире — на соседних вкладках, чтобы не путаться.",
  },
];

export function pluralCars(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "машина";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "машины";
  return "машин";
}

export function humanError(raw?: string) {
  const text = String(raw || "").trim();
  if (!text) return "Не получилось сохранить. Повторите.";
  if (/failed to|error|http \d/i.test(text) && text.length > 80) return "Не получилось сохранить. Повторите.";
  if (/failed to update ad car/i.test(text)) return "Не получилось переключить. Повторите.";
  if (/failed to create/i.test(text)) return "Не получилось добавить машину.";
  if (/failed to delete/i.test(text)) return "Не получилось убрать машину.";
  return text.length > 160 ? "Не получилось сохранить. Повторите." : text;
}
