"use client";

import { Lead } from "@/lib/types";
import { format, isSameDay, startOfDay, isBefore, isToday, addDays, subDays } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, CalendarIcon, Inbox } from "lucide-react";
import { SourceIcon, StatusBadge } from "../ui/LeadBadges";
import { getStatusLabel } from "@/lib/displayUtils";
import { QuickAddLead } from "@/components/leads/ui/QuickAddLead";
import React, { useMemo } from "react";

interface AgendaViewProps {
  leads: Lead[];
  selectedLeadId: string | null;
  onSelectLead: (lead: Lead) => void;
  filterDate: Date;
  setFilterDate: (date: Date) => void;
}

const formatSmartDate = (ts?: number | null) => {
  if (!ts) return "—";
  return format(new Date(ts), "d MMM, HH:mm", { locale: ru });
};

export function AgendaView({
  leads,
  selectedLeadId,
  onSelectLead,
  filterDate,
  setFilterDate,
}: AgendaViewProps) {
  const targetDate = startOfDay(filterDate);
  const realToday = startOfDay(new Date());

  const handlePrevDay = () => setFilterDate(subDays(filterDate, 1));
  const handleNextDay = () => setFilterDate(addDays(filterDate, 1));
  const handleResetToToday = () => setFilterDate(new Date());

  const { newLeads, agendaGroups, overdueLeads } = useMemo(() => {
    const newLeads = leads.filter((l) => l.status === "new");
    
    // Group leads that are scheduled for the filterDate
    const scheduled = leads.filter((l) => {
      if (l.status === "new") return false; 
      if (!l.nextActionDate) return false;
      return isSameDay(new Date(l.nextActionDate), targetDate);
    });

    const groups: Record<string, Lead[]> = {};
    scheduled.forEach((lead) => {
      if (!groups[lead.status]) groups[lead.status] = [];
      groups[lead.status].push(lead);
    });

    const agendaGroups = Object.entries(groups).map(([status, items]) => ({
      status,
      label: getStatusLabel(status as any),
      items: items.sort((a, b) => (a.nextActionDate || 0) - (b.nextActionDate || 0)),
    }));

    // Overdue leads: from new to old (descending)
    const overdueLeads = leads.filter((l) => {
      if (l.status === "new") return false;
      if (!l.nextActionDate) return false;
      return isBefore(startOfDay(new Date(l.nextActionDate)), realToday);
    }).sort((a, b) => (b.nextActionDate || 0) - (a.nextActionDate || 0));

    return { newLeads, agendaGroups, overdueLeads };
  }, [leads, targetDate, realToday]);

  // Card for the Right Sidebar (New Leads)
  const renderLeadCard = (lead: Lead) => {
    const isSelected = selectedLeadId === lead.id;
    return (
      <div
        key={lead.id}
        onClick={() => onSelectLead(lead)}
        className={`p-4 rounded-[1.25rem] border transition-all duration-300 flex flex-col gap-2.5 relative cursor-pointer shadow-sm ${
          isSelected
            ? "bg-white border-blue-400 shadow-[0_8px_24px_-8px_rgba(59,130,246,0.2)] scale-[0.98]"
            : "bg-white/80 hover:bg-white border-zinc-200/60 hover:shadow-md hover:border-zinc-300/80"
        }`}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex flex-col min-w-0">
            <span className={`font-semibold text-[15px] truncate tracking-tight ${isSelected ? "text-blue-700" : "text-zinc-900"}`}>
              {lead.name || <span className="text-zinc-400 italic font-normal">Без имени</span>}
            </span>
            <span className="font-mono text-zinc-500 mt-0.5 text-[12px] font-medium">{lead.phone || "Нет номера"}</span>
          </div>
          <div className="shrink-0 pt-0.5">
            <SourceIcon source={lead.source} className="opacity-50" />
          </div>
        </div>

        {(lead.car || lead.notes) && (
          <div className="bg-zinc-50/80 rounded-xl p-2.5 text-[12px] flex flex-col gap-1 mt-1">
            {lead.car && (
              <div className="font-medium text-zinc-800 truncate">
                <span className="text-zinc-400 font-normal mr-1.5">Авто:</span>
                {lead.car}
              </div>
            )}
            {lead.notes && (
              <div className="text-zinc-600 line-clamp-2 leading-relaxed">
                {lead.notes}
              </div>
            )}
          </div>
        )}
        
        <div className="text-[10px] text-zinc-400 font-medium mt-1">
          {formatSmartDate(lead.createdAt)}
        </div>
      </div>
    );
  };

  // Row layout for Main Agenda Table
  const renderLeadRow = (lead: Lead) => {
    const isSelected = selectedLeadId === lead.id;
    return (
      <div
        key={lead.id}
        onClick={() => onSelectLead(lead)}
        className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:px-5 sm:py-3.5 rounded-[1.25rem] border transition-all duration-300 relative cursor-pointer group ${
          isSelected
            ? "bg-white border-blue-300 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.12)] z-10"
            : "bg-white/60 hover:bg-white border-transparent hover:border-zinc-200/80 hover:shadow-sm"
        }`}
      >
        <div className="flex items-center gap-3.5 w-full sm:w-[35%] min-w-0">
           <SourceIcon source={lead.source} className="opacity-40 group-hover:opacity-70 transition-opacity shrink-0 w-4 h-4" />
           <div className="flex flex-col min-w-0">
              <span className={`font-semibold text-[15px] truncate tracking-tight ${isSelected ? "text-blue-700" : "text-zinc-900"}`}>
                {lead.name || <span className="text-zinc-400 italic font-normal">Без имени</span>}
              </span>
              <span className="font-mono text-zinc-500 mt-0.5 text-[12px]">{lead.phone || "Нет номера"}</span>
           </div>
        </div>
        
        <div className="w-full sm:w-[35%] shrink-0 flex flex-col min-w-0 gap-0.5 justify-center">
           {lead.car && <span className="text-[13px] font-medium text-zinc-800 truncate">{lead.car}</span>}
           {lead.notes && <span className="text-[12px] text-zinc-500 truncate" title={lead.notes}>{lead.notes}</span>}
        </div>

        <div className="flex items-center justify-between sm:justify-end w-full sm:flex-1 gap-4 shrink-0">
           {lead.nextActionDate && lead.status !== "new" && (
             <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
               <Clock className="w-3.5 h-3.5 opacity-40" />
               <span className="text-[12px] whitespace-nowrap">{formatSmartDate(lead.nextActionDate)}</span>
             </div>
           )}
           <StatusBadge status={lead.status} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full bg-[#F3F4F6] overflow-hidden relative">
      {/* Background ambient gradient */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-white to-transparent opacity-60 pointer-events-none" />

      {/* Main Agenda Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        
        {/* Top Header & Actions */}
        <div className="h-16 px-4 md:px-6 bg-white/70 backdrop-blur-xl border-b border-black/5 flex items-center justify-between sticky top-0 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
            <QuickAddLead />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-100/80 rounded-lg">
              <CalendarIcon className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-bold text-zinc-700 tracking-tight">Повестка дня</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-white border border-zinc-200/80 shadow-sm rounded-[10px] p-1">
            <button
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-zinc-100 text-zinc-600 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetToToday}
              className={`px-4 py-1.5 text-[13px] font-bold min-w-[120px] text-center rounded-lg transition-all ${
                isToday(filterDate) ? "text-blue-700 bg-blue-50 shadow-sm" : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {isToday(filterDate) ? "Сегодня" : format(filterDate, "d MMM, EEE", { locale: ru })}
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 hover:bg-zinc-100 text-zinc-600 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Agenda Table Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-8 custom-scrollbar relative">
          <div className="max-w-4xl mx-auto space-y-10 pb-20">
            
            {agendaGroups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="w-16 h-16 bg-white rounded-3xl shadow-sm border border-zinc-100 flex items-center justify-center mb-4">
                  <CalendarIcon className="w-7 h-7 text-zinc-300" />
                </div>
                <h3 className="text-[17px] font-bold text-zinc-800">Нет задач на этот день</h3>
                <p className="text-sm text-zinc-500 mt-1.5 text-center max-w-sm leading-relaxed">
                  Запланированные звонки и встречи будут отображаться здесь единым списком.
                </p>
              </div>
            )}

            {agendaGroups.map((group) => (
              <div key={group.status} className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2.5 ml-2">
                  <h3 className="text-[12px] font-black text-zinc-400 uppercase tracking-[0.15em]">{group.label}</h3>
                  <span className="bg-zinc-200/80 text-zinc-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{group.items.length}</span>
                </div>
                <div className="flex flex-col gap-1.5 bg-white/40 p-1.5 rounded-[1.5rem] border border-white">
                  {group.items.map(renderLeadRow)}
                </div>
              </div>
            ))}

            {/* Overdue Section */}
            {overdueLeads.length > 0 && (
              <div className="mt-16 pt-8 space-y-3 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-red-200 to-transparent" />
                <div className="flex items-center gap-2.5 ml-2">
                  <h3 className="text-[12px] font-black text-red-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Просроченные
                  </h3>
                  <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{overdueLeads.length}</span>
                </div>
                <div className="flex flex-col gap-1.5 bg-white/40 p-1.5 rounded-[1.5rem] border border-white">
                  {overdueLeads.map(renderLeadRow)}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Right Sidebar: New Leads (Floating Modern UI) */}
      <div className="hidden lg:flex w-[340px] shrink-0 my-5 mr-5 rounded-[2rem] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)] bg-white/80 backdrop-blur-2xl border border-white flex-col z-20 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />
        
        <div className="h-16 px-6 relative flex items-center justify-between shrink-0 border-b border-black/[0.03]">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-zinc-900 flex items-center gap-2.5">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </div>
            Новые
          </h2>
          <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-sm">
            {newLeads.length}
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 relative">
          {newLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4 opacity-60">
               <div className="w-12 h-12 rounded-2xl bg-zinc-100/80 border border-zinc-200/50 flex items-center justify-center mb-3 shadow-inner">
                  <Inbox className="w-5 h-5 text-zinc-400" />
               </div>
              <p className="text-sm font-medium text-zinc-600">Отличная работа!</p>
              <p className="text-xs text-zinc-400 mt-1">Все новые заявки обработаны</p>
            </div>
          ) : (
            newLeads.map(renderLeadCard)
          )}
        </div>
      </div>
    </div>
  );
}
