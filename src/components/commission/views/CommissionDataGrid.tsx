"use client";

import { Lead } from "@/lib/types";
import { format, isValid, isToday, isTomorrow, isYesterday, startOfDay, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { StatusBadge } from "@/components/leads/ui/LeadBadges";
import { Clock } from "lucide-react";
import React, { useMemo } from "react";

interface CommissionDataGridProps {
  leads: Lead[];
  selectedLeadId: string | null;
  onSelectLead: (lead: Lead) => void;
  dateFilterKey: "createdAt" | "nextActionDate";
  isHistoryTab?: boolean;
  hasMoreHistory?: boolean;
  isHistoryLoading?: boolean;
  onLoadMore?: () => void;
  targetDate?: Date;
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
    return { key: "no_date", label: filterKey === "nextActionDate" ? "Без даты следующего шага" : "Неизвестная дата", sortOrder: 9999999999, color: "text-zinc-500 bg-white/[0.08]" };
  }

  const d = startOfDay(new Date(dateValue));
  const sortOrder = -d.getTime();

  if (isToday(d)) {
    return { key: d.getTime().toString(), label: "Сегодня", sortOrder, color: "text-blue-300 bg-blue-500/15" };
  }

  if (isYesterday(d)) {
    return { key: d.getTime().toString(), label: "Вчера", sortOrder, color: "text-amber-400 bg-amber-500/15" };
  }

  if (isTomorrow(d)) {
    return { key: d.getTime().toString(), label: "Завтра", sortOrder, color: "text-purple-300 bg-purple-500/15" };
  }

  return { key: d.getTime().toString(), label: format(d, "d MMM yyyy", { locale: ru }), sortOrder, color: "text-zinc-400 bg-white/[0.04]" };
};

export function CommissionDataGrid({
  leads,
  selectedLeadId,
  onSelectLead,
  dateFilterKey,
  isHistoryTab,
  hasMoreHistory,
  isHistoryLoading,
  onLoadMore,
  targetDate
}: CommissionDataGridProps) {

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
        <p className="text-sm font-medium">Нет записей в этой категории</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain custom-scrollbar bg-black md:bg-black rounded-none md:rounded-md border-0 md:border border-white/10 p-0 md:p-0 pb-12" style={{ WebkitOverflowScrolling: 'touch' }}>
      
      {/* ====== DESKTOP DATA GRID ====== */}
      <div className="hidden md:flex flex-col w-full text-[13px] bg-[#141416]">
        {/* Header */}
        <div className="flex text-[10px] text-zinc-400 uppercase bg-[#141416] backdrop-blur-sm sticky top-0 z-10 font-bold tracking-widest border-b border-white/10 py-3 px-2">
          <div className="w-48 px-2">Имя</div>
          <div className="w-36 px-2">Телефон</div>
          <div className="w-36 px-2">Статус</div>
          <div className="w-36 px-2">След. шаг</div>
          <div className="w-48 px-2">Ссылка</div>
          <div className="flex-1 px-2">Комментарий</div>
        </div>

        {/* Body */}
        <div className="flex flex-col">
          {groupedLeads.map(group => (
            <React.Fragment key={group.label}>
              <div className="bg-black border-b border-white/10 py-2 px-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                <span className={`text-[10px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full ${group.color}`}>
                  {group.label} <span className="opacity-60 ml-1">{group.items.length}</span>
                </span>
              </div>

              {group.items.map(lead => {
                const isSelected = selectedLeadId === lead.id;
                return (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className={`flex items-center min-h-[52px] border-b border-white/10 transition-colors group cursor-pointer px-2 ${isSelected ? 'bg-white/[0.08] shadow-[inset_2px_0_0_#f5f5f7]' : 'hover:bg-white/[0.06]'}`}
                  >
                    <div className="w-48 px-2 flex flex-col justify-center">
                      <span className={`font-semibold truncate max-w-full ${isSelected ? 'text-zinc-100' : 'text-zinc-200'}`}>
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
                        <div className="flex items-center gap-1.5 text-zinc-400 font-medium bg-white/[0.08] px-2.5 py-1 rounded-md border border-white/10 w-fit shadow-sm">
                          <Clock className="w-3 h-3 opacity-60" />
                          <span className="whitespace-nowrap">{formatSmartDate(lead.nextActionDate)}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </div>
                    <div className="w-48 px-2 text-zinc-300 text-[12px] truncate">
                      {lead.car || <span className="text-zinc-300">—</span>}
                    </div>
                    <div className="flex-1 px-2 text-zinc-500 text-[12px] truncate flex items-center justify-between">
                      <span className="truncate pr-4" title={lead.notes}>{lead.notes || <span className="text-zinc-300">—</span>}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pr-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-[#141416] border border-white/10 shadow-sm px-2 py-0.5 rounded">Открыть</span>
                      </div>
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
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl py-2 -mx-2 px-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] border-b border-white/10">
               <span className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full ${group.color}`}>
                 {group.label} ({group.items.length})
               </span>
            </div>
            {group.items.map(lead => {
               const isSelected = selectedLeadId === lead.id;
               return (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className={`p-5 rounded-[2rem] border transition-all duration-500 flex flex-col gap-3 relative overflow-hidden cursor-pointer ${isSelected ? 'bg-[#141416] border-blue-400/50 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]' : 'bg-[#141416] backdrop-blur-sm border-white/10 hover:border-white/20 active:scale-[0.97]'}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className={`font-medium text-[17px] truncate tracking-tight transition-colors ${isSelected ? 'text-blue-300' : 'text-zinc-100'}`}>
                          {lead.name || <span className="text-zinc-400 italic">Без имени</span>}
                        </span>
                        <span className="font-mono text-zinc-500/80 mt-0.5 text-[13px]">{lead.phone || "Нет номера"}</span>
                      </div>
                      <div className="shrink-0 pt-0.5">
                        <StatusBadge status={lead.status} />
                      </div>
                    </div>

                    {(lead.car || lead.notes) && (
                      <div className="relative bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 text-sm flex flex-col gap-2">
                        {lead.car && <div className="font-medium text-zinc-200 truncate"><span className="text-zinc-400 font-light mr-1.5">Ссылка:</span>{lead.car}</div>}
                        {lead.notes && <div className="text-zinc-400 line-clamp-3 leading-relaxed mt-0.5 text-[13px]">{lead.notes}</div>}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-1 pt-2">
                      <div className="flex gap-2 items-center">
                      </div>
                      {lead.nextActionDate && lead.status !== 'new' && (
                        <div className="flex items-center gap-1.5 text-amber-400 font-medium bg-amber-500/15 px-3 py-1.5 rounded-full border border-amber-400/20 shadow-sm">
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
        <div className="p-4 flex justify-center border-t border-white/10 bg-white/[0.03]">
          <button
            onClick={onLoadMore}
            disabled={isHistoryLoading}
            className="px-4 py-2 text-sm font-medium text-zinc-400 bg-[#141416] border border-white/10 rounded-md hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors w-full md:w-auto"
          >
            {isHistoryLoading ? "Загрузка..." : "Загрузить еще"}
          </button>
        </div>
      )}
    </div>
  );
}
