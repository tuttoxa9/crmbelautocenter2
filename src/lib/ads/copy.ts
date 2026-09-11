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

export function rotatePath(from: string): string {
  if (from === "rk1") return "К1 → К2";
  if (from === "rk2") return "К2 → К1";
  return rotateLabel(from);
}

export function rotateFromTo(from: string): string {
  if (from === "rk1") return "Из К1 в К2";
  if (from === "rk2") return "Из К2 в К1";
  return rotateLabel(from);
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

export function matchesCarQuery(
  item: { name?: string; year?: string | number; priceUsd?: number },
  raw: string,
): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const hay = [item.name, item.year, item.priceUsd]
    .filter((v) => v != null && v !== "")
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((token) => hay.includes(token));
}

export const HINTS = [
  {
    title: "Две кампании TikTok",
    text: "К1 и К2 — две рекламы. Ролик не висит вечно: через две–три недели машину перекладываем в другую, чтобы креатив не приелся.",
  },
  {
    title: "Сначала ролик, потом эфир",
    text: "В «Нет ролика» — машины без съёмки. Когда ролик готов — «Отснято». Потом ставим в К1 или К2.",
  },
  {
    title: "Что делать сегодня",
    text: "Сверху — кого перенести из К1 и К2. Дальше снять ролик и поставить отснятые в эфир. Внизу — что уже крутится.",
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
