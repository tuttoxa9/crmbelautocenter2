"use client";

import { useMemo } from "react";
import { Lead, LeadStatus } from "@/types/lead";
import { LeadCard } from "./LeadCard";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { isToday, isBefore, startOfDay } from "date-fns";

interface TodayViewProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onQuickStatusChange: (id: string, newStatus: LeadStatus) => void;
}

function Section({ title, leads, onEdit, onQuickStatusChange, isOverdue = false, defaultExpanded = true }: {
  title: string,
  leads: Lead[],
  onEdit: (lead: Lead) => void,
  onQuickStatusChange: (id: string, newStatus: LeadStatus) => void,
  isOverdue?: boolean,
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded && leads.length > 0);

  // Update expanded state smoothly if leads become empty and it was expanded by default
  // using effect instead of updating during render
  useEffect(() => {
    if (leads.length === 0 && defaultExpanded && isExpanded) {
      setIsExpanded(false);
    }
  }, [leads.length, defaultExpanded, isExpanded]);

  return (
    <div className="mb-8">
      <div
        className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-lg transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <h3 className={cn("text-lg font-bold", isOverdue ? "text-red-600" : "text-gray-900")}>
            {title}
          </h3>
          <span className={cn(
            "px-2.5 py-0.5 rounded-full text-sm font-medium",
            isOverdue ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
          )}>
            {leads.length}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
          {leads.length > 0 ? (
            leads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onEdit={onEdit}
                onQuickStatusChange={onQuickStatusChange}
                isOverdue={isOverdue}
              />
            ))
          ) : (
            <div className="col-span-full p-4 text-center text-gray-400 border border-dashed rounded-lg bg-gray-50">
              Нет задач в этой категории
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TodayView({ leads, onEdit, onQuickStatusChange }: TodayViewProps) {
  const today = startOfDay(new Date());

  const groups = useMemo(() => {
    const overdue: Lead[] = [];
    const newLeads: Lead[] = [];
    const callbacks: Lead[] = [];
    const visits: Lead[] = [];

    leads.forEach(lead => {
      // 1. New leads
      if (lead.status === "new") {
        newLeads.push(lead);
        return;
      }

      // 2. Scheduled actions
      if (lead.status === "callback" || lead.status === "visit_planned") {
        if (!lead.plannedDate) return; // Should not happen with valid data, but just in case

        const planned = lead.plannedDate.toDate();

        if (isBefore(planned, today)) {
          overdue.push(lead);
        } else if (isToday(planned)) {
          if (lead.status === "callback") callbacks.push(lead);
          if (lead.status === "visit_planned") visits.push(lead);
        }
      }
    });

    // Sort by time (ascending) for scheduled ones
    const sortByTime = (a: Lead, b: Lead) => {
      if (!a.plannedDate || !b.plannedDate) return 0;
      return a.plannedDate.toDate().getTime() - b.plannedDate.toDate().getTime();
    };

    overdue.sort(sortByTime);
    callbacks.sort(sortByTime);
    visits.sort(sortByTime);

    return { overdue, newLeads, callbacks, visits };
  }, [leads, today]);

  return (
    <div className="pb-8">
      {groups.overdue.length > 0 && (
        <Section
          title="🔴 Просрочено"
          leads={groups.overdue}
          onEdit={onEdit}
          onQuickStatusChange={onQuickStatusChange}
          isOverdue={true}
        />
      )}
      <Section
        title="🆕 Новые"
        leads={groups.newLeads}
        onEdit={onEdit}
        onQuickStatusChange={onQuickStatusChange}
      />
      <Section
        title="📞 Перезвонить"
        leads={groups.callbacks}
        onEdit={onEdit}
        onQuickStatusChange={onQuickStatusChange}
      />
      <Section
        title="🚗 Визиты"
        leads={groups.visits}
        onEdit={onEdit}
        onQuickStatusChange={onQuickStatusChange}
      />
    </div>
  );
}
