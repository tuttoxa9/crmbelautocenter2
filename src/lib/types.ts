export type LeadStatus =
  | "new"                 // Новый
  | "in_progress"         // В работе
  | "visit"               // Приезд
  | "refusal"             // Отказ
  | "bank_refusal"        // Отказ банка
  | "success"             // Оформился/купил
  | "no_answer"           // Недозвон
  | "spam"                // Брак/Тест
  | "thinking"            // Думает
  | "callback";           // Перезвонить

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "in_progress",
  "thinking",
  "callback",
  "visit",
  "no_answer",
  "success",
  "refusal",
  "bank_refusal",
  "spam"
];

export type LeadSource =
  | "site"
  | "instagram"
  | "tiktok"
  | "call"
  | "zapier"
  | "telegram"
  | "walk_in" // С улицы
  | "kufar";

export interface StatusHistoryEntry {
  status: LeadStatus;
  changedAt: number; // Timestamp
  changedBy: string; // Email или имя пользователя
  comment?: string;
}

export interface Lead {
  id?: string;
  name: string;
  phone: string;
  car: string;
  source: LeadSource;
  status: LeadStatus;
  nextActionDate?: number | null; // Timestamp для приезда или перезвона
  notes: string;
  createdAt: number;
  updatedAt: number;
  history: StatusHistoryEntry[];
  payload?: Record<string, unknown>; // Гибкая структура для сырых данных (например из Zapier, Telegram и т.д.)
}

export interface Integration {
  id?: string;
  source: "meta" | "tiktok";
  name: string;
  campaignId?: string;
  formId?: string;
  isActive: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type AdCampaignType = 'rk1' | 'rk2' | 'waiting_video';

export type AdPriceTier = 'tier_under_7k' | 'tier_7k_13k' | 'tier_13k_20k' | 'tier_20k_plus';

export interface AdCar {
  id?: string;
  carId?: string; // ID авто из Neon DB
  name: string;
  year?: number | string;
  priceUsd: number;
  priceTier: AdPriceTier;
  campaign: AdCampaignType;
  startedAt: number; // Timestamp старта открутки в текущей РК
  maxDays?: number; // Лимит дней
  photoUrl?: string;
  notes?: string;
  lastAlertSentAt?: number | null; // Timestamp последней отправки TG алерта
  createdAt: number;
  updatedAt: number;
}

export interface AdsSettings {
  rk1Days: number; // По умолчанию 17
  rk2Days: number; // По умолчанию 14
  targetCarsPerDay?: number; // Target number of cars to rotate per day
  isActive?: boolean;
  chatId?: string;
  botToken?: string;
}
