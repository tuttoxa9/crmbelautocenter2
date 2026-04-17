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
