"use client";

import { Lead, LeadStatus } from "@/lib/types";
import { format, isToday } from "date-fns";
import { ru } from "date-fns/locale";
import { Globe, Search, Clock } from "lucide-react";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";
import { getStatusLabel, getStatusColor } from "@/lib/displayUtils";

interface LeadListProps {
  leads: Lead[];
  selectedLeadId: string | null;
  onSelect: (lead: Lead) => void;
}

const getSourceIcon = (source: string) => {
  switch (source) {
    case 'instagram': return <InstagramIcon className="w-4 h-4 text-pink-600" />;
    case 'tiktok': return <TikTokIcon className="w-4 h-4 text-black" />;
    case 'site': return <Globe className="w-4 h-4 text-blue-600" />;
    case 'telegram': return <TelegramIcon className="w-4 h-4 text-sky-500" />;
    default: return <Search className="w-4 h-4 text-zinc-400" />;
  }
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  if (isToday(date)) {
    return format(date, "HH:mm");
  }
  return format(date, "d MMM", { locale: ru });
};

export function LeadList({ leads, selectedLeadId, onSelect }: LeadListProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400">
        <p>Нет заявок</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto h-full pr-2 pb-20 custom-scrollbar">
      {leads.map(lead => {
        const isSelected = selectedLeadId === lead.id;

        return (
          <div
            key={lead.id}
            onClick={() => onSelect(lead)}
            className={`
              relative p-4 rounded-2xl cursor-pointer transition-all duration-200 border
              ${isSelected
                ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500/20'
                : 'bg-white/60 border-zinc-200/60 hover:bg-white hover:border-zinc-300 hover:shadow-sm'
              }
            `}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <div className="p-1.5 bg-zinc-100 rounded-lg shrink-0">
                  {getSourceIcon(lead.source)}
                </div>
                <div className="font-semibold text-zinc-900 whitespace-normal break-words leading-tight">
                  {lead.name || <span className="text-zinc-400 italic font-medium">Новая заявка</span>}
                </div>
              </div>
              <div className="text-xs text-zinc-400 font-medium">
                {formatTime(lead.createdAt)}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
               <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${getStatusColor(lead.status)}`}>
                 {getStatusLabel(lead.status)}
               </span>
               {lead.nextActionDate && (
                 <span className="flex items-center gap-1 text-xs text-zinc-500 font-medium ml-auto">
                    <Clock className="w-3 h-3" />
                    {format(new Date(lead.nextActionDate), "d MMM, HH:mm", { locale: ru })}
                 </span>
               )}
            </div>
          </div>
        )
      })}
    </div>
  );
}
