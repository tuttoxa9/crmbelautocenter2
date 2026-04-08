"use client";

import React, { useState } from "react";
import { Lead } from "@/lib/types";
import { addDays, subDays, startOfDay, format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FeedCard } from "./FeedCard";

interface DailyFeedProps {
  leads: Lead[];
}

export function DailyFeed({ leads }: DailyFeedProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));

  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const handleToday = () => setSelectedDate(startOfDay(new Date()));

  const isTodayDate = isSameDay(selectedDate, new Date());

  // Filter and group leads
  // 1. New Leads: ALWAYS show them regardless of date, so they stay at the top until taken in progress
  const newLeads = leads
    .filter(l => l.status === "new")
    .sort((a, b) => b.createdAt - a.createdAt);

  // 2. Visits for selected date
  const visitLeads = leads
    .filter(l => l.status === "visit" && l.nextActionDate && isSameDay(new Date(l.nextActionDate), selectedDate))
    .sort((a, b) => (a.nextActionDate || Infinity) - (b.nextActionDate || Infinity));

  // 3. Planned Calls for selected date
  const callLeads = leads
    .filter(l => {
      if (l.status === "new" || l.status === "visit") return false;
      if (["refusal", "bank_refusal", "success", "spam"].includes(l.status)) return false;

      if (l.nextActionDate) {
        const actionDate = new Date(l.nextActionDate);
        // Show if scheduled for this exact date
        if (isSameDay(actionDate, selectedDate)) return true;

        // Show overdue leads IF viewing today
        if (isTodayDate && actionDate < startOfDay(new Date())) return true;

        return false;
      }

      // If no explicit nextActionDate, show them on today's view by default
      return isTodayDate;
    })
    .sort((a, b) => (a.nextActionDate || Infinity) - (b.nextActionDate || Infinity));

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col pt-4 pb-12">
      {/* Date Navigation Header */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-[12px] shadow-soft border border-zinc-100 mb-8 shrink-0">
        <button onClick={handlePrevDay} className="p-2 hover:bg-zinc-100 text-zinc-600 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          className="flex flex-col items-center cursor-pointer hover:bg-zinc-50 px-6 py-1 rounded-lg transition-colors"
          onClick={handleToday}
        >
          <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">
            {isTodayDate ? "Сегодня" : format(selectedDate, "EEEE", { locale: ru })}
          </span>
          <span className={`text-lg font-bold tracking-tight ${isTodayDate ? 'text-blue-600' : 'text-zinc-900'}`}>
            {format(selectedDate, "d MMMM", { locale: ru })}
          </span>
        </div>

        <button onClick={handleNextDay} className="p-2 hover:bg-zinc-100 text-zinc-600 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-8 px-1 pb-10">

        {/* 🔥 НОВЫЕ ЗАЯВКИ */}
        {(newLeads.length > 0 || isTodayDate) && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-zinc-800 uppercase tracking-wide">🔥 Новые заявки</span>
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{newLeads.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {newLeads.length === 0 ? (
                <div className="text-sm text-zinc-400 bg-white border border-dashed border-zinc-200 rounded-[12px] p-4 text-center">
                  Нет новых заявок
                </div>
              ) : (
                newLeads.map(lead => <FeedCard key={lead.id} lead={lead} />)
              )}
            </div>
          </section>
        )}

        {/* 🚗 ПРИЕЗДЫ НА СЕГОДНЯ */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-zinc-800 uppercase tracking-wide">🚗 Приезды</span>
            <span className="bg-zinc-200 text-zinc-700 text-xs font-bold px-2 py-0.5 rounded-full">{visitLeads.length}</span>
          </div>
          <div className="flex flex-col gap-3">
            {visitLeads.length === 0 ? (
              <div className="text-sm text-zinc-400 bg-white border border-dashed border-zinc-200 rounded-[12px] p-4 text-center">
                Нет запланированных приездов
              </div>
            ) : (
              visitLeads.map(lead => <FeedCard key={lead.id} lead={lead} />)
            )}
          </div>
        </section>

        {/* 📞 ЗАПЛАНИРОВАННЫЕ ЗВОНКИ */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-zinc-800 uppercase tracking-wide">📞 Запланированные звонки</span>
            <span className="bg-zinc-200 text-zinc-700 text-xs font-bold px-2 py-0.5 rounded-full">{callLeads.length}</span>
          </div>
          <div className="flex flex-col gap-3">
            {callLeads.length === 0 ? (
              <div className="text-sm text-zinc-400 bg-white border border-dashed border-zinc-200 rounded-[12px] p-4 text-center">
                Нет запланированных звонков
              </div>
            ) : (
              callLeads.map(lead => <FeedCard key={lead.id} lead={lead} />)
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
