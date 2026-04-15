"use client";

import { Lead } from "@/lib/types";
import { format, isValid, isToday, isTomorrow, isYesterday, startOfDay, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { SourceIcon, StatusBadge } from "../ui/LeadBadges";
import { Clock } from "lucide-react";
import React, { useMemo } from "react";

interface LeadDataGridProps {
  leads: Lead[];
  selectedLeadId: string | null;
  onSelectLead: (lead: Lead) => void;
  dateFilterKey: "createdAt" | "nextActionDate";
  isHistoryTab?: boolean;
  hasMoreHistory?: boolean;
  isHistoryLoading?: boolean;
  onLoadMore?: () => void;
  targetDate?: Date; // The currently selected filter date
}

const formatSmartDate = (ts?: number | null) => {
  if (!ts) return "—";
  const d = new Date(ts);
  if (!isValid(d)) return "—";

  if (isToday(d)) return `Сегодня, ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `Завтра, ${format(d, "HH:mm")}`;
  if (isYesterday(d)) return `Вчера, ${format(d, "HH:mm")}`;

  return format(d, "d MMM, HH:mm", { locale: ru });
};

const getGroupInfo = (dateValue: number | null | undefined, filterKey: "createdAt" | "nextActionDate"): { key: string, label: string, sortOrder: number, color: string } => {
  if (!dateValue || !isValid(new Date(dateValue))) {
    return { key: "no_date", label: filterKey === "nextActionDate" ? "Без даты следующего шага" : "Неизвестная дата", sortOrder: 9999999999, color: "text-zinc-500 bg-zinc-100" };
  }

  const d = startOfDay(new Date(dateValue));

  // Create a sorting order based on timestamp descending.
  // Negating the timestamp so newer dates appear first (lower sortOrder)
  const sortOrder = -d.getTime();

  if (isToday(d)) {
    return { key: d.getTime().toString(), label: "Сегодня", sortOrder, color: "text-blue-600 bg-blue-50" };
  }

  if (isYesterday(d)) {
    return { key: d.getTime().toString(), label: "Вчера", sortOrder, color: "text-amber-600 bg-amber-50" };
  }

  if (isTomorrow(d)) {
    return { key: d.getTime().toString(), label: "Завтра", sortOrder, color: "text-purple-600 bg-purple-50" };
  }

  return { key: d.getTime().toString(), label: format(d, "d MMM yyyy", { locale: ru }), sortOrder, color: "text-zinc-600 bg-zinc-50" };
};

export function LeadDataGrid({
  leads,
  selectedLeadId,
  onSelectLead,
  dateFilterKey,
  isHistoryTab,
  hasMoreHistory,
  isHistoryLoading,
  onLoadMore,
  targetDate
}: LeadDataGridProps) {

  const groupedLeads = useMemo(() => {
    const groups: Record<string, { label: string, color: string, sortOrder: number, items: Lead[] }> = {};

    leads.forEach(lead => {
      const dateVal = dateFilterKey === "nextActionDate" ? lead.nextActionDate : lead.createdAt;
      const info = getGroupInfo(dateVal, dateFilterKey);

      if (!groups[info.key]) {
        groups[info.key] = { label: info.label, color: info.color, sortOrder: info.sortOrder, items: [] };
      }
      groups[info.key].items.push(lead);
    });

    // Sort items within each group (newest created first)
    Object.values(groups).forEach(g => {
       g.items.sort((a, b) => {
          const aDate = dateFilterKey === "nextActionDate" ? (a.nextActionDate || 0) : a.createdAt;
          const bDate = dateFilterKey === "nextActionDate" ? (b.nextActionDate || 0) : b.createdAt;
          return bDate - aDate;
       });
    });

    return Object.values(groups).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [leads, dateFilterKey]);


  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-8">
        <p className="text-sm font-medium">Нет лидов в этой категории</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#F4F5F7] md:bg-white rounded-none md:rounded-md border-0 md:border border-zinc-200 space-y-4 md:space-y-0 p-2 md:p-0">
      
      {/* ====== DESKTOP DATA GRID (META STYLE) ====== */}
      <div className="hidden md:flex flex-col w-full text-[13px] bg-white">
        {/* Header */}
        <div className="flex text-[10px] text-zinc-400 uppercase bg-white/95 backdrop-blur-sm sticky top-0 z-10 font-bold tracking-widest border-b border-zinc-200/50 py-3 px-2">
          <div className="w-12 text-center">Ист.</div>
          <div className="w-48 px-2">Имя</div>
          <div className="w-36 px-2">Телефон</div>
          <div className="w-36 px-2">Статус</div>
          <div className="w-36 px-2">След. шаг</div>
          <div className="w-48 px-2">Машина</div>
          <div className="flex-1 px-2">Комментарий</div>
          <div className="w-24 px-2 text-right">Создан</div>
        </div>

        {/* Body */}
        <div className="flex flex-col">
          {groupedLeads.map(group => (
            <React.Fragment key={group.label}>
              {/* Group Header */}
              <div className="bg-[#FAFAFA] border-b border-zinc-100/60 py-2 px-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                <span className={`text-[10px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full ${group.color}`}>
                  {group.label} <span className="opacity-60 ml-1">{group.items.length}</span>
                </span>
              </div>

              {/* Group Items */}
              {group.items.map(lead => {
                const isSelected = selectedLeadId === lead.id;
                return (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className={`flex items-center min-h-[52px] border-b border-zinc-100/50 transition-colors group cursor-pointer px-2 ${isSelected ? 'bg-zinc-100/60 shadow-[inset_2px_0_0_#27272a]' : 'hover:bg-zinc-50'}`}
                  >
                    <div className="w-12 flex justify-center opacity-40 group-hover:opacity-80 transition-opacity">
                      <SourceIcon source={lead.source} className="w-3.5 h-3.5" />
                    </div>
                    <div className="w-48 px-2 flex flex-col justify-center">
                      <span className={`font-semibold truncate max-w-full ${isSelected ? 'text-zinc-900' : 'text-zinc-800'}`}>
                        {lead.name || <span className="text-zinc-400 italic font-normal">Без имени</span>}
                      </span>
                    </div>
                    <div className="w-36 px-2 font-mono text-[12px] font-medium text-zinc-500">
                      {lead.phone || <span className="text-zinc-300">---</span>}
                    </div>
                    <div className="w-36 px-2 flex items-center">
                      <StatusBadge status={lead.status} />
                    </div>
                    <div className="w-36 px-2 text-[12px]">
                      {lead.nextActionDate && lead.status !== 'new' ? (
                        <div className="flex items-center gap-1.5 text-zinc-600 font-medium bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200/50 w-fit shadow-sm">
                          <Clock className="w-3 h-3 opacity-60" />
                          <span className="whitespace-nowrap">{formatSmartDate(lead.nextActionDate)}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </div>
                    <div className="w-48 px-2 text-zinc-700 text-[12px] truncate">
                      {lead.car || <span className="text-zinc-300">—</span>}
                    </div>
                    <div className="flex-1 px-2 text-zinc-500 text-[12px] truncate flex items-center justify-between">
                      <span className="truncate pr-4" title={lead.notes}>{lead.notes || <span className="text-zinc-300">—</span>}</span>
                      {/* Ghost actions on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pr-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-white border border-zinc-200 shadow-sm px-2 py-0.5 rounded">Открыть</span>
                      </div>
                    </div>
                    <div className="w-24 px-2 text-right text-[11px] text-zinc-400 font-medium">
                      {formatSmartDate(lead.createdAt)}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ====== MOBILE CARDS ====== */}
      <div className="md:hidden space-y-4 pb-4">
        {groupedLeads.map(group => (
          <div key={group.label} className="space-y-2">
            <div className="sticky top-0 z-10 bg-[#F4F5F7]/95 backdrop-blur py-1.5 -mx-2 px-2">
               <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-sm ${group.color}`}>
                 {group.label} ({group.items.length})
               </span>
            </div>
            {group.items.map(lead => {
               const isSelected = selectedLeadId === lead.id;
               return (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-3 relative overflow-hidden cursor-pointer ${isSelected ? 'bg-blue-50/40 border-blue-300 ring-2 ring-blue-400/20 shadow-md' : 'bg-white border-zinc-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] active:scale-[0.98]'}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className={`font-extrabold text-[16px] truncate tracking-tight transition-colors ${isSelected ? 'text-blue-900' : 'text-zinc-900'}`}>
                          {lead.name || <span className="text-zinc-400 italic font-normal">Без имени</span>}
                        </span>
                        <span className="font-mono text-zinc-500/80 mt-0.5 text-[13px]">{lead.phone || "Нет номера"}</span>
                      </div>
                      <div className="shrink-0 pt-0.5">
                        <StatusBadge status={lead.status} />
                      </div>
                    </div>

                    {(lead.car || lead.notes) && (
                      <div className="relative bg-zinc-50/50 backdrop-blur-sm border border-zinc-100 rounded-xl p-3 text-sm flex flex-col gap-2 shadow-inner">
                        {lead.car && <div className="font-semibold text-zinc-800 truncate"><span className="text-zinc-400 font-medium mr-1.5">Авто:</span>{lead.car}</div>}
                        {lead.notes && <div className="text-zinc-600 line-clamp-3 leading-relaxed mt-0.5 text-[13px]">{lead.notes}</div>}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-1 pt-2">
                      <div className="flex gap-2 items-center">
                        <div className="opacity-50 transition-opacity hover:opacity-100"><SourceIcon source={lead.source} /></div>
                        <span className="text-[11px] text-zinc-400 font-medium tracking-wide">{formatSmartDate(lead.createdAt)}</span>
                      </div>
                      {lead.nextActionDate && lead.status !== 'new' && (
                        <div className="flex items-center gap-1.5 text-orange-700 font-bold bg-gradient-to-r from-orange-100/80 to-orange-50/80 px-3 py-1.5 rounded-lg border border-orange-200 shadow-sm">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs whitespace-nowrap">{formatSmartDate(lead.nextActionDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
               )
            })}
          </div>
        ))}
      </div>

      {isHistoryTab && hasMoreHistory && (
        <div className="p-4 flex justify-center border-t border-zinc-200 bg-zinc-50/30">
          <button
            onClick={onLoadMore}
            disabled={isHistoryLoading}
            className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors w-full md:w-auto"
          >
            {isHistoryLoading ? "Загрузка..." : "Загрузить еще"}
          </button>
        </div>
      )}
    </div>
  );
}
