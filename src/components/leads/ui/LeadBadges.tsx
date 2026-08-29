"use client";

import { cn } from "@/lib/utils";
import { LeadStatus } from "@/lib/types";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";
import { getStatusLabel } from "@/lib/displayUtils";
import { Globe, Search, PhoneCall, User, ShoppingBag } from "lucide-react";

export const getStatusDotColor = (status: LeadStatus) => {
  const config: Record<LeadStatus, string> = {
    new: "bg-blue-400",
    in_progress: "bg-amber-400",
    visit: "bg-violet-400",
    refusal: "bg-zinc-500",
    bank_refusal: "bg-red-400",
    success: "bg-emerald-400",
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
      "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-300 md:px-2.5 md:py-1 md:text-[11px]",
      className
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full shadow-sm", dotColorClass)} />
      {getStatusLabel(status)}
    </span>
  );
};

export const SourceIcon = ({ source, className }: { source: string, className?: string }) => {
  const iconClass = cn("w-4 h-4", className);
  switch (source) {
    case 'instagram': return <InstagramIcon className={cn(iconClass, "text-pink-500")} />;
    case 'tiktok': return <TikTokIcon className={cn(iconClass, "text-white")} />;
    case 'telegram': return <TelegramIcon className={cn(iconClass, "text-sky-400")} />;
    case 'site': return <Globe className={cn(iconClass, "text-blue-400")} />;
    case 'call': return <PhoneCall className={cn(iconClass, "text-emerald-400")} />;
    case 'walk_in': return <User className={cn(iconClass, "text-amber-400")} />;
    case 'kufar': return <ShoppingBag className={cn(iconClass, "text-emerald-400")} />;
    default: return <Search className={cn(iconClass, "text-zinc-400")} />;
  }
};
