"use client";

import { Lead } from "@/lib/types";
import { format, differenceInHours } from "date-fns";
import { ru } from "date-fns/locale";
import { Clock, Car, MapPin } from "lucide-react";

interface VisitTimelineProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export function VisitTimeline({ leads, onSelectLead }: VisitTimelineProps) {
  if (leads.length === 0) {
    return (
      <div className="h-full border-2 border-dashed border-zinc-200/80 rounded-[2rem] bg-zinc-50/50 flex flex-col items-center justify-center text-zinc-400 p-8 text-center min-h-[300px]">
        <p className="text-sm font-medium">Нет назначенных приездов</p>
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      {leads.map((lead) => {
        const visitDate = lead.nextActionDate ? new Date(lead.nextActionDate) : null;
        const hoursUntilVisit = visitDate ? differenceInHours(visitDate, now) : null;
        const isUrgent = hoursUntilVisit !== null && hoursUntilVisit >= 0 && hoursUntilVisit <= 2;
        const isOverdue = hoursUntilVisit !== null && hoursUntilVisit < 0;

        return (
          <div
            key={lead.id}
            onClick={() => onSelectLead(lead)}
            className={`
              bg-white rounded-3xl p-5 shadow-sm border transition-all cursor-pointer hover:shadow-md
              ${isUrgent ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/30' : 'border-zinc-200/60'}
              ${isOverdue ? 'border-red-200 bg-red-50/30 opacity-70' : ''}
            `}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isUrgent ? 'bg-amber-100 text-amber-600' : isOverdue ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'}`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900">{lead.name || "Клиент"}</h4>
                  <p className="text-xs font-medium text-zinc-500 mt-0.5">{lead.phone}</p>
                </div>
              </div>

              {visitDate && (
                <div className="text-right">
                  <div className={`flex items-center gap-1.5 font-bold ${isUrgent ? 'text-amber-600' : isOverdue ? 'text-red-500' : 'text-zinc-900'}`}>
                    <Clock className="w-4 h-4" />
                    {format(visitDate, "HH:mm")}
                  </div>
                  <div className="text-xs font-medium text-zinc-400 mt-1 uppercase tracking-wider">
                    {format(visitDate, "d MMM", { locale: ru })}
                  </div>
                </div>
              )}
            </div>

            {lead.car && (
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 bg-zinc-50 rounded-xl p-3">
                <Car className="w-4 h-4 text-zinc-400" />
                {lead.car}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
