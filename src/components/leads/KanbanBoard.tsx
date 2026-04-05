"use client";

import { Lead, LeadStatus } from "@/lib/types";
import { getStatusLabel, getStatusColor } from "@/lib/displayUtils";
import { Badge } from "@/components/ui/badge";
import { LeadDrawer } from "./LeadDrawer";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarClock, Trash2 } from "lucide-react";
import { deleteLead } from "@/lib/leadService";
import { Button } from "@/components/ui/button";

interface KanbanBoardProps {
  leads: Lead[];
  onLeadChange?: () => void;
}

const COLUMNS: { id: LeadStatus; label: string }[] = [
  { id: "new", label: "Новые" },
  { id: "visit", label: "Ждем приезда" },
  { id: "success", label: "Успешно" },
];

export function KanbanBoard({ leads, onLeadChange }: KanbanBoardProps) {
  // Simple grouping without drag and drop for now
  const columnsData = COLUMNS.map((col) => ({
    ...col,
    items: leads.filter((lead) => lead.status === col.id),
  }));

  const handleDelete = async (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    if (!confirm("Вы уверены, что хотите удалить этого лида?")) return;
    try {
      await deleteLead(leadId);
      if (onLeadChange) onLeadChange();
    } catch (error) {
      console.error("Error deleting lead:", error);
      alert("Ошибка при удалении");
    }
  };

  return (
    <div className="flex h-full w-full gap-4 overflow-x-auto pb-4">
      {columnsData.map((column) => (
        <div key={column.id} className="flex flex-col min-w-[300px] w-[300px] flex-shrink-0 bg-zinc-50/50 rounded-xl border border-zinc-200">
          <div className="p-3 border-b border-zinc-200 flex justify-between items-center bg-white rounded-t-xl">
            <h3 className="font-medium text-sm text-zinc-800">{column.label}</h3>
            <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 font-normal">
              {column.items.length}
            </Badge>
          </div>

          <div className="p-3 flex-1 overflow-y-auto space-y-3">
            {column.items.map((lead) => (
              <LeadDrawer
                key={lead.id}
                lead={lead}
                onChange={onLeadChange}
                trigger={
                  <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm cursor-pointer hover:border-zinc-300 transition-colors text-left w-full group relative">

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-600 rounded bg-white shadow-sm border border-zinc-100"
                        onClick={(e) => handleDelete(e, lead.id!)}
                        title="Удалить лида"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-start mb-2 pr-8">
                      <div className="font-medium text-sm text-zinc-900 group-hover:text-blue-600 transition-colors truncate pr-2">
                        {lead.name}
                      </div>
                      <Badge className={`text-[10px] px-1.5 py-0 h-4 ${getStatusColor(lead.status)} text-white border-transparent flex-shrink-0`}>
                        {getStatusLabel(lead.status)}
                      </Badge>
                    </div>

                    <div className="text-xs text-zinc-500 mb-2 truncate">
                      {lead.phone}
                    </div>

                    {lead.car && (
                      <div className="text-xs bg-zinc-50 border border-zinc-100 rounded px-2 py-1 text-zinc-600 truncate mt-2">
                        {lead.car}
                      </div>
                    )}

                    <div className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded w-fit border
                      ${lead.nextActionDate
                        ? (isPast(lead.nextActionDate) && !isToday(lead.nextActionDate)
                          ? "bg-red-50 text-red-600 border-red-100"
                          : isToday(lead.nextActionDate)
                          ? "bg-amber-50 text-amber-600 border-amber-100"
                          : "bg-blue-50 text-blue-600 border-blue-100")
                        : "bg-zinc-50 text-zinc-500 border-zinc-200"
                      }
                    `}>
                      <CalendarClock className="h-3 w-3" />
                      {lead.nextActionDate
                        ? (isToday(lead.nextActionDate)
                          ? "Сегодня"
                          : isTomorrow(lead.nextActionDate)
                          ? "Завтра"
                          : format(lead.nextActionDate, "d MMM, HH:mm", { locale: ru }))
                        : (lead.createdAt ? format(typeof lead.createdAt === 'object' && lead.createdAt !== null && 'seconds' in lead.createdAt ? new Date((lead.createdAt as {seconds: number}).seconds * 1000) : new Date(lead.createdAt as string | number), "d MMM", { locale: ru }) : "—")
                      }
                    </div>
                  </div>
                }
              />
            ))}

            {column.items.length === 0 && (
              <div className="text-center p-4 text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-lg">
                Нет лидов
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
