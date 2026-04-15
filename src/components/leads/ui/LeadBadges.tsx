"use client";

import { cn } from "@/lib/utils";
import { LeadStatus } from "@/lib/types";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";
import { getStatusLabel } from "@/lib/displayUtils";
import { Globe, Search, PhoneCall, User } from "lucide-react";

export const getStatusConfig = (status: LeadStatus) => {
  const config: Record<LeadStatus, { bg: string, text: string, border: string }> = {
    new: { bg: "bg-blue-50/50", text: "text-blue-600", border: "border-blue-200" },
    in_progress: { bg: "bg-amber-50/50", text: "text-amber-600", border: "border-amber-200" },
    visit: { bg: "bg-purple-50/50", text: "text-purple-600", border: "border-purple-200" },
    refusal: { bg: "bg-zinc-50", text: "text-zinc-500", border: "border-zinc-200" },
    bank_refusal: { bg: "bg-red-50/50", text: "text-red-600", border: "border-red-200" },
    success: { bg: "bg-emerald-50/50", text: "text-emerald-600", border: "border-emerald-200" },
    no_answer: { bg: "bg-orange-50/50", text: "text-orange-600", border: "border-orange-200" },
    spam: { bg: "bg-zinc-100", text: "text-zinc-400", border: "border-zinc-200" },
    thinking: { bg: "bg-indigo-50/50", text: "text-indigo-600", border: "border-indigo-200" },
    callback: { bg: "bg-yellow-50/50", text: "text-yellow-600", border: "border-yellow-200" },
  };
  return config[status] || config.new;
};

export const StatusBadge = ({ status, className }: { status: LeadStatus, className?: string }) => {
  const conf = getStatusConfig(status);
  return (
    <span className={cn(
      "inline-flex items-center justify-center px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-[4px] border",
      conf.bg, conf.text, conf.border,
      className
    )}>
      {getStatusLabel(status)}
    </span>
  );
};

export const SourceIcon = ({ source, className }: { source: string, className?: string }) => {
  const iconClass = cn("w-4 h-4", className);
  switch (source) {
    case 'instagram': return <InstagramIcon className={cn(iconClass, "text-pink-600")} />;
    case 'tiktok': return <TikTokIcon className={cn(iconClass, "text-black")} />;
    case 'telegram': return <TelegramIcon className={cn(iconClass, "text-sky-500")} />;
    case 'site': return <Globe className={cn(iconClass, "text-blue-500")} />;
    case 'call': return <PhoneCall className={cn(iconClass, "text-emerald-600")} />;
    case 'walk_in': return <User className={cn(iconClass, "text-amber-600")} />;
    default: return <Search className={cn(iconClass, "text-zinc-400")} />;
  }
};
