"use client";

import { Lead } from "@/lib/types";
import { format, isValid, isToday, isTomorrow, isYesterday, startOfDay, isBefore, isAfter, startOfWeek } from "date-fns";
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

type GroupKey = "overdue" | "today" | "tomorrow" | "future" | "yesterday" | "this_week" | "older" | "no_date";

const getGroupInfo = (dateValue: number | null | undefined, filterKey: "createdAt" | "nextActionDate"): { key: GroupKey, label: string, sortOrder: number, color: string } => {
  if (!dateValue || !isValid(new Date(dateValue))) {
    return { key: "no_date", label: filterKey === "nextActionDate" ? "Без даты следующего шага" : "Неизвестная дата", sortOrder: 99, color: "text-zinc-500 bg-zinc-100" };
  }

  const d = new Date(dateValue);
  const today = startOfDay(new Date());

  if (filterKey === "nextActionDate") {
    if (isBefore(startOfDay(d), today)) return { key: "overdue", label: "Просроченные (Требуют внимания)", sortOrder: 1, color: "text-red-600 bg-red-50" };
    if (isToday(d)) return { key: "today", label: "Сегодня", sortOrder: 2, color: "text-blue-600 bg-blue-50" };
    if (isTomorrow(d)) return { key: "tomorrow", label: "Завтра", sortOrder: 3, color: "text-amber-600 bg-amber-50" };
    return { key: "future", label: "Будущие", sortOrder: 4, color: "text-zinc-500 bg-zinc-50" };
  } else {
    // createdAt sorting
    if (isToday(d)) return { key: "today", label: "Сегодня", sortOrder: 1, color: "text-blue-600 bg-blue-50" };
    if (isYesterday(d)) return { key: "yesterday", label: "Вчера", sortOrder: 2, color: "text-amber-600 bg-amber-50" };
    if (isAfter(d, startOfWeek(today, { weekStartsOn: 1 }))) return { key: "this_week", label: "На этой неделе", sortOrder: 3, color: "text-zinc-600 bg-zinc-50" };
    return { key: "older", label: "Старые", sortOrder: 4, color: "text-zinc-500 bg-zinc-50" };
  }
};

export function LeadDataGrid({
  leads,
  selectedLeadId,
  onSelectLead,
  dateFilterKey,
  isHistoryTab,
  hasMoreHistory,
  isHistoryLoading,
  onLoadMore
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

    // Sort items within each group
    Object.values(groups).forEach(g => {
       g.items.sort((a, b) => {
          const aDate = dateFilterKey === "nextActionDate" ? (a.nextActionDate || 0) : a.createdAt;
          const bDate = dateFilterKey === "nextActionDate" ? (b.nextActionDate || 0) : b.createdAt;
          // for future dates we want ascending, for past dates descending.
          if (g.sortOrder === 4 && dateFilterKey === "nextActionDate") return aDate - bDate;
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
    <div className="flex-1 overflow-auto custom-scrollbar bg-white rounded-md border border-zinc-200">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="text-xs text-zinc-500 uppercase bg-zinc-50/80 sticky top-0 z-10 font-semibold border-b border-zinc-200">
          <tr>
            <th className="px-4 py-3 font-medium tracking-wider w-10">Ист.</th>
            <th className="px-4 py-3 font-medium tracking-wider w-48">Имя</th>
            <th className="px-4 py-3 font-medium tracking-wider w-40">Телефон</th>
            <th className="px-4 py-3 font-medium tracking-wider w-32">Статус</th>
            <th className="px-4 py-3 font-medium tracking-wider">След. шаг / Машина</th>
            <th className="px-4 py-3 font-medium tracking-wider text-right w-40">Создан</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100/80">
          {groupedLeads.map(group => (
            <React.Fragment key={group.label}>
              {/* Group Header */}
              <tr className="bg-zinc-50/30">
                <td colSpan={6} className="px-4 py-2 border-y border-zinc-100">
                  <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-sm ${group.color}`}>
                    {group.label} ({group.items.length})
                  </span>
                </td>
              </tr>
              {/* Group Items */}
              {group.items.map(lead => {
                const isSelected = selectedLeadId === lead.id;
                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className={`
                      group cursor-pointer transition-colors h-12
                      ${isSelected ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-zinc-50/50'}
                    `}
                  >
                    <td className="px-4 py-2 text-center">
                      <div className="flex justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                        <SourceIcon source={lead.source} />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-zinc-900'} truncate block max-w-[200px]`}>
                        {lead.name || <span className="text-zinc-400 italic font-normal">Без имени</span>}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs font-medium text-zinc-600">
                      <div className="flex items-center gap-1.5">
                        {lead.phone || <span className="text-zinc-400">---</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-2 text-zinc-500 text-xs truncate max-w-[300px]">
                      {lead.nextActionDate && lead.status !== 'new' ? (
                        <div className="flex items-center gap-1.5 text-orange-600 font-medium bg-orange-50/50 px-2 py-0.5 rounded border border-orange-100 w-fit">
                          <Clock className="w-3 h-3" />
                          {formatSmartDate(lead.nextActionDate)}
                        </div>
                      ) : (
                        <span className="truncate block">{lead.car || <span className="text-zinc-300">—</span>}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-zinc-400 font-medium">
                      {formatSmartDate(lead.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {isHistoryTab && hasMoreHistory && (
        <div className="p-4 flex justify-center border-t border-zinc-200 bg-zinc-50/30">
          <button
            onClick={onLoadMore}
            disabled={isHistoryLoading}
            className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            {isHistoryLoading ? "Загрузка..." : "Загрузить еще"}
          </button>
        </div>
      )}
    </div>
  );
}
