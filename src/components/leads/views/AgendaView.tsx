"use client";

import { Lead } from "@/lib/types";
import { format, isSameDay, startOfDay, isBefore, isToday, addDays, subDays } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, CalendarIcon } from "lucide-react";
import { SourceIcon, StatusBadge } from "../ui/LeadBadges";
import { getStatusLabel } from "@/lib/displayUtils";
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
      if (l.status === "new") return false; // Handled separately
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

    // Overdue leads: nextActionDate is strictly before today, and not new
    const overdueLeads = leads.filter((l) => {
      if (l.status === "new") return false;
      if (!l.nextActionDate) return false; // Can't be overdue if no date
      return isBefore(startOfDay(new Date(l.nextActionDate)), realToday);
    }).sort((a, b) => (a.nextActionDate || 0) - (b.nextActionDate || 0));

    return { newLeads, agendaGroups, overdueLeads };
  }, [leads, targetDate, realToday]);

  const renderLeadCard = (lead: Lead) => {
    const isSelected = selectedLeadId === lead.id;
    return (
      <div
        key={lead.id}
        onClick={() => onSelectLead(lead)}
        className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-3 relative cursor-pointer ${
          isSelected
            ? "bg-white border-blue-400 shadow-[0_0_0_2px_rgba(59,130,246,0.1)]"
            : "bg-white hover:bg-zinc-50 border-zinc-200/80 hover:shadow-md"
        }`}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex flex-col min-w-0">
            <span className={`font-semibold text-[15px] truncate ${isSelected ? "text-blue-700" : "text-zinc-900"}`}>
              {lead.name || <span className="text-zinc-400 italic font-normal">Без имени</span>}
            </span>
            <span className="font-mono text-zinc-500 mt-0.5 text-[12px]">{lead.phone || "Нет номера"}</span>
          </div>
          <div className="shrink-0">
            <StatusBadge status={lead.status} />
          </div>
        </div>

        {(lead.car || lead.notes) && (
          <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-[13px] flex flex-col gap-1.5">
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

        <div className="flex items-center justify-between mt-1">
          <div className="flex gap-1.5 items-center">
            <SourceIcon source={lead.source} className="opacity-60" />
            <span className="text-[10px] text-zinc-400 font-medium">Создан: {formatSmartDate(lead.createdAt)}</span>
          </div>
          {lead.nextActionDate && lead.status !== "new" && (
            <div className="flex items-center gap-1.5 text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100/50">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px] whitespace-nowrap">{formatSmartDate(lead.nextActionDate)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full bg-[#F4F5F7] overflow-hidden">
      {/* Main Agenda Area */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-200">
        
        {/* Date Navigator */}
        <div className="h-14 px-4 md:px-6 bg-white border-b border-zinc-200 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-zinc-400" />
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Повестка дня</h2>
          </div>
          
          <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg p-1">
            <button
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-zinc-200 text-zinc-600 rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetToToday}
              className={`px-3 py-1.5 text-sm font-semibold min-w-[110px] text-center rounded-md transition-colors ${
                isToday(filterDate) ? "text-blue-700 bg-blue-100/50" : "text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {isToday(filterDate) ? "Сегодня" : format(filterDate, "d MMM, EEE", { locale: ru })}
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 hover:bg-zinc-200 text-zinc-600 rounded-md transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Agenda Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-8 pb-12">
            
            {agendaGroups.length === 0 && (
              <div className="text-center py-12 px-4 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                <CalendarIcon className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-[15px] font-semibold text-zinc-700">На этот день нет запланированных задач</h3>
                <p className="text-sm text-zinc-500 mt-1">Здесь появятся лиды, у которых дата следующего шага совпадает с выбранной датой.</p>
              </div>
            )}

            {agendaGroups.map((group) => (
              <div key={group.status} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold text-zinc-800 uppercase tracking-wide">{group.label}</h3>
                  <span className="bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full text-xs font-bold">{group.items.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {group.items.map(renderLeadCard)}
                </div>
              </div>
            ))}

            {/* Overdue Section (Always shown at the bottom if exists) */}
            {overdueLeads.length > 0 && (
              <div className="mt-12 pt-8 border-t-2 border-red-100 space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold text-red-700 uppercase tracking-wide flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Просроченные задачи
                  </h3>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">{overdueLeads.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-90 hover:opacity-100 transition-opacity">
                  {overdueLeads.map(renderLeadCard)}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Right Sidebar: New Leads */}
      <div className="w-[320px] shrink-0 bg-white flex flex-col shadow-[-4px_0_12px_rgba(0,0,0,0.02)] z-20">
        <div className="h-14 px-4 bg-zinc-950 text-white flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Новые заявки
          </h2>
          <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs font-bold">
            {newLeads.length}
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-zinc-50/50 space-y-3">
          {newLeads.length === 0 ? (
            <div className="text-center py-8 px-2">
              <p className="text-sm font-medium text-zinc-400">Нет новых необработанных заявок</p>
            </div>
          ) : (
            newLeads.map(renderLeadCard)
          )}
        </div>
      </div>
    </div>
  );
}
