"use client";

import { Lead } from "@/lib/types";
import { Globe, Search, Clock } from "lucide-react";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { motion } from "framer-motion";

interface LeadStackCardProps {
  lead: Lead;
  isTop: boolean;
  type: "new" | "active";
  onClick?: () => void;
}

const getSourceIcon = (source: string) => {
  switch (source) {
    case 'instagram': return <InstagramIcon className="w-5 h-5 text-pink-600" />;
    case 'tiktok': return <TikTokIcon className="w-5 h-5 text-black" />;
    case 'site': return <Globe className="w-5 h-5 text-blue-600" />;
    case 'telegram': return <TelegramIcon className="w-5 h-5 text-sky-500" />;
    default: return <Search className="w-5 h-5 text-zinc-400" />;
  }
};

export function LeadStackCard({ lead, isTop, type, onClick }: LeadStackCardProps) {

  const timeInStatus = lead.history.length > 0
    ? lead.history[lead.history.length - 1].changedAt
    : lead.createdAt;

  return (
    <motion.div
      layout
      onClick={onClick}
      className="w-full bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-zinc-200/50 cursor-pointer overflow-hidden flex flex-col gap-4"
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-4 items-center">
          <div className="p-3 bg-zinc-100 rounded-2xl shrink-0">
            {getSourceIcon(lead.source)}
          </div>
          <div>
            <h4 className="font-bold text-xl text-zinc-900 leading-tight">
              {lead.name || "Новая заявка"}
            </h4>
            {lead.car && <p className="text-zinc-600 font-medium text-sm mt-1">{lead.car}</p>}
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">В статусе</span>
          <span className="text-sm font-medium text-zinc-700 flex items-center gap-1 mt-0.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDistanceToNow(timeInStatus, { locale: ru })}
          </span>
        </div>
      </div>

      {lead.status === "callback" && lead.nextActionDate && (
        <div className="mt-2 pt-3 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-xs font-bold text-red-500 uppercase tracking-wider animate-pulse">Звонок назначен:</span>
          <span className="text-sm font-extrabold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md">
             {new Date(lead.nextActionDate).toLocaleDateString('ru')} в {new Date(lead.nextActionDate).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
    </motion.div>
  );
}
