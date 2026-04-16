"use client";

import { cn } from "@/lib/utils";
import { LeadStatus } from "@/lib/types";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";
import { getStatusLabel } from "@/lib/displayUtils";
import { Globe, Search, PhoneCall, User } from "lucide-react";

export const getStatusDotColor = (status: LeadStatus) => {
  const config: Record<LeadStatus, string> = {
    new: "bg-blue-500",
    in_progress: "bg-amber-400",
    visit: "bg-purple-500",
    refusal: "bg-zinc-400",
    bank_refusal: "bg-red-500",
    success: "bg-emerald-500",
    no_answer: "bg-orange-400",
    spam: "bg-zinc-300",
    thinking: "bg-indigo-400",
    callback: "bg-yellow-400",
  };
  return config[status] || config.new;
};

export const StatusBadge = ({ status, className }: { status: LeadStatus, className?: string }) => {
  const dotColorClass = getStatusDotColor(status);
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 border border-border/60 rounded-[6px] text-zinc-700 font-medium text-[11px] transition-colors",
      className
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dotColorClass)} />
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
