"use client";

import { Lead } from "@/lib/types";
import { format, isToday, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { Clock, Phone, CalendarIcon, Loader2 } from "lucide-react";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";
import { getStatusLabel, getStatusColor } from "@/lib/displayUtils";

interface LeadListProps {
  leads: Lead[];
  isLoading: boolean;
  onSelect: (lead: Lead) => void;
  selectedLeadId: string | null;
}

const getSourceIcon = (source: string) => {
  switch (source) {
    case 'instagram': return <InstagramIcon className="w-4 h-4 text-pink-600" />;
    case 'tiktok': return <TikTokIcon className="w-4 h-4 text-black" />;
    case 'telegram': return <TelegramIcon className="w-4 h-4 text-sky-500" />;
    default: return <div className="w-4 h-4 rounded-full bg-zinc-200" />;
  }
};

export function LeadList({ leads, isLoading, onSelect, selectedLeadId }: LeadListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-zinc-500 gap-4">
        <p className="text-sm font-medium">Нет лидов, соответствующих фильтрам.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {leads.map(lead => {
        const isSelected = selectedLeadId === lead.id;
        const createdAt = new Date(lead.createdAt);
        const actionDate = lead.nextActionDate ? new Date(lead.nextActionDate) : null;

        return (
          <div
            key={lead.id}
            onClick={() => onSelect(lead)}
            className={`
              group flex items-center justify-between p-4 bg-white rounded-2xl cursor-pointer transition-all border
              ${isSelected ? 'border-zinc-900 shadow-sm ring-1 ring-zinc-900' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm'}
            `}
          >
            {/* Left side: Source, Name, Phone */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 shrink-0">
                {getSourceIcon(lead.source)}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-900 truncate">{lead.name || "Без имени"}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getStatusColor(lead.status)}`}>
                    {getStatusLabel(lead.status)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 font-medium">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone || "Нет номера"}</span>
                  <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {isValid(createdAt) ? format(createdAt, "d MMM, HH:mm", { locale: ru }) : ""}</span>
                </div>
              </div>
            </div>

            {/* Right side: Next Action */}
            <div className="shrink-0 flex items-center justify-end w-32 ml-4">
              {actionDate && isValid(actionDate) && lead.status !== "new" && (
                <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${
                  isToday(actionDate) ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {format(actionDate, "d MMM", { locale: ru })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
