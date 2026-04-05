export type LeadStatus =
  | "new"                 // Новый
  | "visit"               // Приезд
  | "refusal"             // Отказ
  | "bank_refusal"        // Отказ банка
  | "success"             // Оформился/купил
  | "no_answer"           // Недозвон
  | "spam";               // Брак/Тест

export type LeadSource =
  | "site"
  | "instagram"
  | "tiktok"
  | "call"
  | "zapier"
  | "walk_in"; // С улицы

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
