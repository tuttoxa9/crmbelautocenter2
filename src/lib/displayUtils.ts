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
    new: "bg-blue-100 text-blue-700 border-blue-200",
    in_progress: "bg-amber-100 text-amber-700 border-amber-200",
    visit: "bg-purple-100 text-purple-700 border-purple-200",
    refusal: "bg-zinc-100 text-zinc-700 border-zinc-200",
    bank_refusal: "bg-red-100 text-red-700 border-red-200",
    success: "bg-emerald-100 text-emerald-700 border-emerald-200",
    no_answer: "bg-orange-100 text-orange-700 border-orange-200",
    spam: "bg-zinc-100 text-zinc-500 border-zinc-200",
    thinking: "bg-indigo-100 text-indigo-700 border-indigo-200",
    callback: "bg-yellow-100 text-yellow-700 border-yellow-200",
  };
  return map[status] || "bg-zinc-100 text-zinc-700";
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
