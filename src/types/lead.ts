import { Timestamp } from "firebase/firestore";

export type LeadSource = "website" | "tiktok" | "instagram" | "phone" | "manual";

export type LeadStatus =
  | "new"
  | "contacted"
  | "callback"
  | "visit_planned"
  | "visited"
  | "deal"
  | "refused"
  | "no_answer"
  | "trash";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  carInterest?: string;
  plannedDate: Timestamp | null;
  notes?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const STATUS_MAP: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: "Новый", color: "bg-blue-100 text-blue-800 border-blue-200" },
  contacted: { label: "Связались", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  callback: { label: "Перезвонить", color: "bg-orange-100 text-orange-800 border-orange-200" },
  visit_planned: { label: "Визит назначен", color: "bg-purple-100 text-purple-800 border-purple-200" },
  visited: { label: "Приехал", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  deal: { label: "Сделка", color: "bg-green-100 text-green-800 border-green-200" },
  refused: { label: "Отказ", color: "bg-red-100 text-red-800 border-red-200" },
  no_answer: { label: "Не отвечает", color: "bg-gray-200 text-gray-800 border-gray-300" },
  trash: { label: "Мусор", color: "bg-slate-700 text-slate-100 border-slate-800" },
};

export const SOURCE_MAP: Record<LeadSource, string> = {
  website: "Сайт",
  tiktok: "TikTok",
  instagram: "Instagram",
  phone: "Звонок",
  manual: "Вручную",
};
