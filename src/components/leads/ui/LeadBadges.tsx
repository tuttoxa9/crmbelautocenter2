"use client";

import { cn } from "@/lib/utils";
import { LeadStatus } from "@/lib/types";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";
import { getStatusLabel } from "@/lib/displayUtils";
import { Globe, Search, PhoneCall, User, ShoppingBag } from "lucide-react";

const STATUS_DOT: Record<LeadStatus, string> = {
  new: "#8ea0b5",
  in_progress: "#c4a15a",
  visit: "#8d84b8",
  callback: "#b7a06a",
  no_answer: "#b5836a",
  thinking: "#7f92b0",
  success: "#7d9a78",
  refusal: "#8a867e",
  bank_refusal: "#c4554a",
  spam: "#5e5a55",
};

export const getStatusDotColor = (status: LeadStatus) => STATUS_DOT[status] || STATUS_DOT.new;

export const StatusBadge = ({ status, className }: { status: LeadStatus, className?: string }) => {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium text-leads-ink", className)}>
      <span className="size-2 shrink-0 rounded-full" style={{ background: getStatusDotColor(status) }} />
      {getStatusLabel(status)}
    </span>
  );
};

export const SourceIcon = ({ source, className }: { source: string, className?: string }) => {
  const iconClass = cn("w-4 h-4", className);
  switch (source) {
    case 'instagram': return <InstagramIcon className={cn(iconClass, "text-leads-muted")} />;
    case 'tiktok': return <TikTokIcon className={cn(iconClass, "text-leads-muted")} />;
    case 'telegram': return <TelegramIcon className={cn(iconClass, "text-leads-muted")} />;
    case 'site': return <Globe className={cn(iconClass, "text-leads-muted")} />;
    case 'call': return <PhoneCall className={cn(iconClass, "text-leads-muted")} />;
    case 'walk_in': return <User className={cn(iconClass, "text-leads-muted")} />;
    case 'kufar': return <ShoppingBag className={cn(iconClass, "text-leads-muted")} />;
    default: return <Search className={cn(iconClass, "text-leads-muted")} />;
  }
};
