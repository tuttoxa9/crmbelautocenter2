"use client";

import { Lead, LeadStatus } from "@/lib/types";
import { format, isToday } from "date-fns";
import { ru } from "date-fns/locale";
import { Globe, Search, Clock, Phone, Calendar as CalendarIcon, Filter, Layers, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";
import { getStatusLabel, getStatusColor, getSourceLabel } from "@/lib/displayUtils";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface LeadListProps {
  leads: Lead[];
  selectedLeadId: string | null;
  onSelect: (lead: Lead) => void;
}

type TabValue = "active" | "success" | "refusal" | "spam";

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
  const [activeTab, setActiveTab] = useState<TabValue>("active");

  const filterByTab = (lead: Lead) => {
    switch (activeTab) {
      case "success": return lead.status === "success";
      case "refusal": return lead.status === "refusal" || lead.status === "bank_refusal";
      case "spam": return lead.status === "spam";
      case "active":
      default:
        return !["success", "refusal", "bank_refusal", "spam"].includes(lead.status);
    }
  };

  const filteredLeads = leads.filter(filterByTab);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white rounded-3xl border border-zinc-200 shadow-sm">
      <div className="flex-none p-4 sm:p-6 border-b border-zinc-100">
        <h2 className="text-2xl font-black text-zinc-800 mb-6 flex items-center gap-2">
          <Layers className="w-6 h-6 text-blue-500" />
          Архив и База
        </h2>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-zinc-100 p-1 rounded-2xl h-12">
             <TabsTrigger value="active" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold text-xs sm:text-sm transition-all">
                Активные
             </TabsTrigger>
             <TabsTrigger value="success" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 font-bold text-xs sm:text-sm transition-all">
                Успешные
             </TabsTrigger>
             <TabsTrigger value="refusal" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-600 font-bold text-xs sm:text-sm transition-all">
                Отказы
             </TabsTrigger>
             <TabsTrigger value="spam" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-zinc-600 font-bold text-xs sm:text-sm transition-all">
                Брак
             </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-zinc-50/30">
        {filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 opacity-60">
            <Filter className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Нет заявок в этой категории</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredLeads.map(lead => {
              const isSelected = selectedLeadId === lead.id;

              return (
                <div
                  key={lead.id}
                  onClick={() => onSelect(lead)}
                  className={`
                    relative p-4 rounded-2xl cursor-pointer transition-all duration-200 border bg-white flex flex-col sm:flex-row gap-4 sm:items-center justify-between group hover:-translate-y-0.5
                    ${isSelected ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20 z-10' : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-md'}
                  `}
                >
                  {/* Left Section: Name, Source, Date */}
                  <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-zinc-50 rounded-2xl shrink-0 border border-zinc-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                      {getSourceIcon(lead.source)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 truncate text-base sm:text-lg">
                          {lead.name || <span className="text-zinc-400 italic">Без имени</span>}
                        </span>
                        <span className={`shrink-0 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${getStatusColor(lead.status)}`}>
                           {getStatusLabel(lead.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs font-medium text-zinc-500">
                         <span className="flex items-center gap-1.5 bg-zinc-100 px-2 py-0.5 rounded-md">
                           <Phone className="w-3 h-3" /> {lead.phone}
                         </span>
                         <span className="flex items-center gap-1">
                           <CalendarIcon className="w-3 h-3 text-zinc-400" /> {format(new Date(lead.createdAt), "d MMM yyyy, HH:mm", { locale: ru })}
                         </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Status/Action Info */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-3 sm:pt-0 border-t border-zinc-100 sm:border-0 mt-2 sm:mt-0">
                    <div className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                      {getSourceLabel(lead.source)}
                    </div>
                    {lead.nextActionDate && activeTab === "active" && (
                      <span className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg font-bold border border-orange-100">
                         <Clock className="w-3.5 h-3.5" />
                         {format(new Date(lead.nextActionDate), "d MMM, HH:mm", { locale: ru })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}
