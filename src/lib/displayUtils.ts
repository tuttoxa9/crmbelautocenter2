import { LeadStatus } from "@/lib/types";

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
    new: "bg-blue-500/10 text-blue-200 border-blue-500/20",
    in_progress: "bg-amber-500/10 text-amber-200 border-amber-500/20",
    visit: "bg-violet-500/10 text-violet-200 border-violet-500/20",
    refusal: "bg-white/[0.06] text-zinc-300 border-white/10",
    bank_refusal: "bg-red-500/10 text-red-300 border-red-500/20",
    success: "bg-emerald-500/10 text-emerald-200 border-emerald-500/20",
    no_answer: "bg-orange-500/10 text-orange-200 border-orange-500/20",
    spam: "bg-white/[0.06] text-zinc-500 border-white/10",
    thinking: "bg-indigo-500/10 text-indigo-200 border-indigo-500/20",
    callback: "bg-yellow-500/10 text-yellow-200 border-yellow-500/20",
  };
  return map[status] || "bg-white/[0.06] text-zinc-300";
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
    kufar: "Куфар",
  };
  return map[source] || "Неизвестно";
};
