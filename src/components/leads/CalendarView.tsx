"use client";

import { useState, useMemo } from "react";
import { Lead, LeadStatus } from "@/types/lead";
import { Calendar } from "@/components/ui/calendar";
import { LeadCard } from "./LeadCard";
import { isSameDay, format, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";

interface CalendarViewProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onQuickStatusChange: (id: string, newStatus: LeadStatus) => void;
}

export function CalendarView({ leads, onEdit, onQuickStatusChange }: CalendarViewProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Filter leads that have planned dates and are in callback or visit_planned status
  const scheduledLeads = useMemo(() => {
    return leads.filter(
      lead => lead.plannedDate && (lead.status === "callback" || lead.status === "visit_planned")
    );
  }, [leads]);

  // Get leads for the selected date
  const selectedDateLeads = useMemo(() => {
    if (!date) return [];

    const targetDay = startOfDay(date);
    return scheduledLeads.filter(lead => {
      if (!lead.plannedDate) return false;
      return isSameDay(lead.plannedDate.toDate(), targetDay);
    }).sort((a, b) => {
      // Sort by time within the same day
      return (a.plannedDate?.toDate().getTime() || 0) - (b.plannedDate?.toDate().getTime() || 0);
    });
  }, [scheduledLeads, date]);

  // Function to determine if a day has leads, to customize the calendar rendering
  // shadcn calendar provides modifiers
  const modifiers = useMemo(() => {
    const dates = scheduledLeads.map(lead => startOfDay(lead.plannedDate!.toDate()));
    return {
      hasTasks: dates,
    };
  }, [scheduledLeads]);

  const modifiersStyles = {
    hasTasks: {
      fontWeight: "bold",
      textDecoration: "underline",
      textDecorationColor: "#3b82f6", // blue-500
      textDecorationThickness: "2px",
      textUnderlineOffset: "4px"
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-fit">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          locale={ru}
          className="rounded-md"
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
        />
      </div>

      <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center justify-between">
          <span>{date ? format(date, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}</span>
          <span className="text-sm font-normal text-gray-500 px-2 py-1 bg-gray-200 rounded-full">
            {selectedDateLeads.length} задач
          </span>
        </h3>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {selectedDateLeads.length > 0 ? (
            selectedDateLeads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onEdit={onEdit}
                onQuickStatusChange={onQuickStatusChange}
              />
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-gray-500 flex flex-col items-center">
              <p>На этот день ничего не запланировано</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
