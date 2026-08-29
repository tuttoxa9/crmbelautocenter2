import { LeadStatus } from "@/lib/types";

export interface StatusConfig {
  value: LeadStatus;
  label: string;
  colorClass: string;
}

export const LEAD_STATUSES: StatusConfig[] = [
  { value: "new", label: "Новый", colorClass: "bg-white/5 text-zinc-200 border-white/10" },
  { value: "in_progress", label: "В работе", colorClass: "bg-amber-500/10 text-amber-200 border-amber-500/20" },
  { value: "visit", label: "Приезд", colorClass: "bg-violet-500/10 text-violet-200 border-violet-500/20" },
  { value: "success", label: "Оформился/купил", colorClass: "bg-emerald-500/10 text-emerald-200 border-emerald-500/20" },
  { value: "no_answer", label: "Недозвон", colorClass: "bg-orange-500/10 text-orange-200 border-orange-500/20" },
  { value: "refusal", label: "Отказ", colorClass: "bg-white/5 text-zinc-400 border-white/10" },
  { value: "bank_refusal", label: "Отказ банка", colorClass: "bg-red-500/10 text-red-300 border-red-500/20" },
  { value: "spam", label: "Брак/Тест", colorClass: "bg-white/5 text-zinc-500 border-white/10" },
  { value: "thinking", label: "Думает", colorClass: "bg-indigo-500/10 text-indigo-200 border-indigo-500/20" },
  { value: "callback", label: "Перезвонить", colorClass: "bg-yellow-500/10 text-yellow-200 border-yellow-500/20" },
];
