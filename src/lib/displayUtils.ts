import { LeadStatus, LeadSource } from "@/lib/types";
import { LEAD_STATUSES } from "@/constants/leadStatuses";

export const getStatusLabel = (status: LeadStatus) => {
  const statusConfig = LEAD_STATUSES.find(s => s.value === status);
  return statusConfig?.label || status;
};

export const getStatusColor = (status: LeadStatus) => {
  const statusConfig = LEAD_STATUSES.find(s => s.value === status);
  return statusConfig?.colorClass || "bg-zinc-100 text-zinc-700";
};

export const getSourceLabel = (source: LeadSource) => {
  const map: Record<LeadSource, string> = {
    site: "Сайт",
    instagram: "Instagram",
    tiktok: "TikTok",
    call: "Звонок",
    zapier: "Zapier",
    telegram: "Telegram",
    walk_in: "С улицы",
  };
  return map[source] || source;
};
