import { LeadStatus } from "@/lib/types";

export interface StatusConfig {
  value: LeadStatus;
  label: string;
  colorClass: string;
}

export const LEAD_STATUSES: StatusConfig[] = [
  { value: "new", label: "Новый", colorClass: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "in_progress", label: "В работе", colorClass: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "visit", label: "Приезд", colorClass: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "success", label: "Оформился/купил", colorClass: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "no_answer", label: "Недозвон", colorClass: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "refusal", label: "Отказ", colorClass: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  { value: "bank_refusal", label: "Отказ банка", colorClass: "bg-red-100 text-red-700 border-red-200" },
  { value: "spam", label: "Брак/Тест", colorClass: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  { value: "thinking", label: "Думает", colorClass: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "callback", label: "Перезвонить", colorClass: "bg-yellow-100 text-yellow-700 border-yellow-200" },
];
