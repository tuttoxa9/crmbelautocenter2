import { LeadStatus, LeadSource } from "@/lib/types";

export const getStatusLabel = (status: LeadStatus) => {
  const map: Record<LeadStatus, string> = {
    new: "Новый",
    visit: "Приезд",
    refusal: "Отказ",
    bank_refusal: "Отказ банка",
    success: "Оформился/купил",
    no_answer: "Недозвон",
    spam: "Брак/Тест",
  };
  return map[status] || status;
};

export const getStatusColor = (status: LeadStatus) => {
  const map: Record<LeadStatus, string> = {
    new: "bg-red-500 hover:bg-red-600",
    visit: "bg-purple-500 hover:bg-purple-600",
    refusal: "bg-slate-800 hover:bg-slate-900",
    bank_refusal: "bg-orange-700 hover:bg-orange-800",
    success: "bg-green-600 hover:bg-green-700",
    no_answer: "bg-yellow-500 hover:bg-yellow-600",
    spam: "bg-zinc-400 hover:bg-zinc-500",
  };
  return map[status] || "bg-zinc-500";
};

export const getSourceLabel = (source: LeadSource) => {
  const map: Record<LeadSource, string> = {
    site: "Сайт",
    instagram: "Instagram",
    tiktok: "TikTok",
    call: "Звонок",
    zapier: "Zapier",
    walk_in: "С улицы",
  };
  return map[source] || source;
};
