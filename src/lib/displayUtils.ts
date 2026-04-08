import { LeadStatus, LeadSource } from "@/lib/types";

export const getStatusLabel = (status: LeadStatus) => {
  const map: Record<LeadStatus, string> = {
    new: "Новый",
    in_progress: "В работе",
    visit: "Приезд",
    refusal: "Отказ",
    bank_refusal: "Отказ банка",
    success: "Оформился/купил",
    no_answer: "Недозвон",
    spam: "Брак/Тест",
    thinking: "Думает",
    callback: "Перезвонить",
  };
  return map[status] || status;
};

export const getStatusColor = (status: LeadStatus) => {
  const map: Record<LeadStatus, string> = {
    new: "bg-zinc-900 text-white border-zinc-900",
    in_progress: "bg-zinc-100 text-zinc-900 border-zinc-200",
    visit: "bg-zinc-100 text-zinc-900 border-zinc-200",
    refusal: "bg-zinc-50 text-zinc-500 border-zinc-200",
    bank_refusal: "bg-zinc-50 text-zinc-500 border-zinc-200",
    success: "bg-zinc-100 text-zinc-900 border-zinc-200",
    no_answer: "bg-zinc-50 text-zinc-600 border-zinc-200",
    spam: "bg-zinc-50 text-zinc-400 border-zinc-100",
    thinking: "bg-zinc-100 text-zinc-800 border-zinc-200",
    callback: "bg-zinc-100 text-zinc-900 border-zinc-200",
  };
  return map[status] || "bg-white text-zinc-700 border-zinc-200";
};

export const getSourceLabel = (source: string) => {
  const map: Record<string, string> = {
    site: "Сайт",
    instagram: "Instagram",
    tiktok: "TikTok",
    call: "Звонок",
    zapier: "Интеграция",
    telegram: "Телеграм",
    walk_in: "С улицы",
  };
  return map[source] || "Неизвестно";
};
