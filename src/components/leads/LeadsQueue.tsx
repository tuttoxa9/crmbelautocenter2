"use client";

import { useState } from "react";
import { format, isToday, isYesterday, isTomorrow, isSameDay, addDays, subDays } from "date-fns";
import { ru } from "date-fns/locale";
import { Lead } from "@/lib/types";
import { ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { getSourceIcon } from "./Icons";

interface LeadsQueueProps {
  leads: Lead[];
  selectedLeadId: string | null;
  onSelectLead: (id: string) => void;
}

export function LeadsQueue({ leads, selectedLeadId, onSelectLead }: LeadsQueueProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const handleToday = () => setSelectedDate(new Date());

  const isCurrentToday = isToday(selectedDate);
  const isCurrentYesterday = isYesterday(selectedDate);
  const isCurrentTomorrow = isTomorrow(selectedDate);

  let dateLabel = format(selectedDate, "d MMMM", { locale: ru });
  if (isCurrentToday) dateLabel = "СЕГОДНЯ (" + dateLabel + ")";
  else if (isCurrentYesterday) dateLabel = "ВЧЕРА (" + dateLabel + ")";
  else if (isCurrentTomorrow) dateLabel = "ЗАВТРА (" + dateLabel + ")";

  // Filter leads based on selected date
  const filteredLeads = leads.filter(lead => {
    // "New" leads always show up regardless of the selected date to ensure they are handled
    if (lead.status === "new") return true;

    if (!lead.nextActionDate) return false;
    const actionDate = new Date(lead.nextActionDate);

    // For 'Today', show overdue items as well.
    if (isCurrentToday) {
      return isSameDay(actionDate, selectedDate) || actionDate < selectedDate;
    }

    return isSameDay(actionDate, selectedDate);
  });

  // Grouping
  const newLeads = filteredLeads.filter(l => l.status === "new");
  const visits = filteredLeads.filter(l => l.status === "visit");
  const calls = filteredLeads.filter(l => l.status === "callback" || l.status === "no_answer" || l.status === "thinking" || l.status === "in_progress");

  // Sorting
  const sortByTime = (a: Lead, b: Lead) => {
    const timeA = a.nextActionDate || a.createdAt;
    const timeB = b.nextActionDate || b.createdAt;
    return timeA - timeB;
  };

  newLeads.sort(sortByTime);
  visits.sort(sortByTime);
  calls.sort(sortByTime);

  return (
    <div className="flex flex-col h-full">
      {/* Date Switcher */}
      <div className="flex-none p-3 border-b border-gray-200 bg-white sticky top-0 z-10 flex items-center justify-between">
        <button onClick={handlePrevDay} className="p-1 hover:bg-gray-100 rounded text-gray-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={handleToday} className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors">
          {dateLabel}
        </button>
        <button onClick={handleNextDay} className="p-1 hover:bg-gray-100 rounded text-gray-500">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {newLeads.length > 0 && (
          <QueueSection title="НОВЫЕ ЗАЯВКИ" leads={newLeads} selectedId={selectedLeadId || ""} onSelect={onSelectLead} />
        )}

        {visits.length > 0 && (
          <QueueSection title="ПРИЕЗДЫ" leads={visits} selectedId={selectedLeadId || ""} onSelect={onSelectLead} />
        )}

        {calls.length > 0 && (
          <QueueSection title="ЗАПЛАНИРОВАННЫЕ ЗВОНКИ" leads={calls} selectedId={selectedLeadId || ""} onSelect={onSelectLead} />
        )}

        {filteredLeads.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            Нет задач на этот день
          </div>
        )}
      </div>
    </div>
  );
}

function QueueSection({ title, leads, selectedId, onSelect }: { title: string, leads: Lead[], selectedId: string, onSelect: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-gray-500 tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">
        {leads.map(lead => (
          <QueueCard key={lead.id} lead={lead} isActive={lead.id === selectedId} onClick={onSelect} />
        ))}
      </div>
    </div>
  );
}

function QueueCard({ lead, isActive, onClick }: { lead: Lead, isActive: boolean, onClick: (id: string) => void }) {
  const sourceIcon = getSourceIcon(lead.source || "unknown");
  const timeDate = lead.nextActionDate ? new Date(lead.nextActionDate) : new Date(lead.createdAt);
  const timeString = format(timeDate, "HH:mm");

  // Highlight red if it's a new lead from yesterday or older
  const isOverdueNew = lead.status === "new" && timeDate < new Date(new Date().setHours(0,0,0,0));

  return (
    <div
      onClick={() => { if (lead.id) onClick(lead.id) }}
      className={`
        p-3 rounded-xl cursor-pointer transition-all border
        ${isActive
          ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`text-xs font-semibold ${isOverdueNew ? 'text-red-600' : 'text-gray-500'}`}>
          {timeString}
        </div>
        <div className="text-gray-400 [&_svg]:w-4 [&_svg]:h-4">
          {sourceIcon}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-gray-900 truncate">
          {lead.name || "Без имени"}
        </div>
        <div className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-gray-400" />
          {lead.phone}
        </div>
      </div>
    </div>
  );
}
