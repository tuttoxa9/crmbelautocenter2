"use client";

import { Lead } from "@/lib/types";
import { format, isToday, isTomorrow, addHours, isBefore } from "date-fns";
import { ru } from "date-fns/locale";
import { Clock, User, Phone, MapPin } from "lucide-react";

interface VisitTimelineProps {
  leads: Lead[];
}

const formatVisitTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const timeString = format(date, "HH:mm");

  if (isToday(date)) return `Сегодня, ${timeString}`;
  if (isTomorrow(date)) return `Завтра, ${timeString}`;
  return format(date, "d MMM, HH:mm", { locale: ru });
};

export function VisitTimeline({ leads }: VisitTimelineProps) {
  return (
    <div className="flex flex-col h-full w-full max-w-[400px] mx-auto">
      <h2 className="text-xl font-bold text-zinc-800 mb-6 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-purple-500" />
        Радар приездов
        <span className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full ml-2">
          {leads.length}
        </span>
      </h2>

      <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-20">
        {leads.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-zinc-200 rounded-3xl bg-zinc-50/50">
            <p className="text-zinc-500 font-medium">Нет запланированных приездов</p>
          </div>
        )}

        {leads.map((lead) => {
          // Check if visit is within next 2 hours
          const visitDate = new Date(lead.nextActionDate!);
          const twoHoursFromNow = addHours(new Date(), 2);
          const isSoon = isBefore(visitDate, twoHoursFromNow) && visitDate > new Date();

          return (
            <div
              key={lead.id}
              className={`
                bg-white p-4 rounded-2xl shadow-sm border transition-all
                ${isSoon ? 'ring-2 ring-amber-400 border-amber-100' : 'border-zinc-100'}
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  p-2 rounded-xl shrink-0 mt-1
                  ${isSoon ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'}
                `}>
                  <Clock className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-zinc-900 truncate pr-2">
                      {formatVisitTime(lead.nextActionDate!)}
                    </h4>
                    {isSoon && (
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                        Скоро
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-2">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="truncate">{lead.name || "Без имени"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{lead.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
