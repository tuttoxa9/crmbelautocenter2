"use client";

import { Lead } from "@/lib/types";
import { format, isValid, isToday, isTomorrow, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";
import { SourceIcon, StatusBadge } from "../ui/LeadBadges";
import { Clock } from "lucide-react";

interface LeadDataGridProps {
  leads: Lead[];
  selectedLeadId: string | null;
  onSelectLead: (lead: Lead) => void;
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

export function LeadDataGrid({ leads, selectedLeadId, onSelectLead }: LeadDataGridProps) {
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
          {leads.map(lead => {
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
        </tbody>
      </table>
    </div>
  );
}
