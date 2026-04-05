"use client";

import { Lead, LeadStatus } from "@/lib/types";
import { getStatusLabel, getStatusColor, getSourceLabel } from "@/lib/displayUtils";
import { Badge } from "@/components/ui/badge";
import { LeadDrawer } from "./LeadDrawer";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarClock, Trash2, Phone, Globe, MessageCircle, Clock, Copy, Check, Car } from "lucide-react";
import { deleteLead } from "@/lib/leadService";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface KanbanBoardProps {
  leads: Lead[];
}

const COLUMNS: { id: LeadStatus; label: string }[] = [
  { id: "new", label: "Новые" },
  { id: "no_answer", label: "Недозвон" },
  { id: "in_progress", label: "В работе" },
  { id: "visit", label: "Ждем приезда" },
];

const getSourceIcon = (source: string) => {
  switch (source) {
    case 'instagram': return <MessageCircle className="h-3 w-3" />;
    case 'tiktok': return <MessageCircle className="h-3 w-3" />;
    case 'site': return <Globe className="h-3 w-3" />;
    case 'call': return <Phone className="h-3 w-3" />;
    default: return <Globe className="h-3 w-3" />;
  }
};

export function KanbanBoard({ leads }: KanbanBoardProps) {
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const handleCopyPhone = (e: React.MouseEvent, phone: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };
  // Simple grouping without drag and drop for now
  const columnsData = COLUMNS.map((col) => {
    let items = leads.filter((lead) => lead.status === col.id);

    // Sort "no_answer" column by createdAt (oldest first or newest first, let's do newest first)
    if (col.id === "no_answer") {
      items = items.sort((a, b) => b.createdAt - a.createdAt);
    }

    return {
      ...col,
      items
    };
  });

  const handleDelete = async (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    if (!confirm("Вы уверены, что хотите удалить этого лида?")) return;
    try {
      await deleteLead(leadId);
    } catch (error) {
      console.error("Error deleting lead:", error);
      alert("Ошибка при удалении");
    }
  };

  return (
    <div className="flex h-full w-full gap-5 overflow-x-auto pb-4 items-start">
      {columnsData.map((column) => (
        <div key={column.id} className="flex flex-col min-w-[320px] w-[320px] flex-shrink-0">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-semibold text-[15px] text-zinc-800">{column.label}</h3>
            <span className="text-xs font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
              {column.items.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {column.items.map((lead) => (
              <LeadDrawer
                key={lead.id}
                lead={lead}
                trigger={
                  <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all text-left w-full group relative block">

                    {/* Source Badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 text-zinc-400 bg-zinc-50 px-2 py-1 rounded-md text-[10px] font-medium border border-zinc-100">
                      {getSourceIcon(lead.source)}
                      <span className="uppercase tracking-wider">{lead.source}</span>
                    </div>

                    <div className="flex flex-col mb-3 pr-16">
                      <div className="font-semibold text-base text-zinc-900 group-hover:text-zinc-700 transition-colors truncate">
                        {lead.name}
                      </div>

                      <div
                        className="text-sm text-zinc-500 flex items-center gap-1.5 mt-1 hover:text-zinc-800 transition-colors w-fit"
                        onClick={(e) => handleCopyPhone(e, lead.phone, lead.id!)}
                      >
                        {copiedPhoneId === lead.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Phone className="h-3 w-3" />}
                        {lead.phone}
                      </div>
                    </div>

                    {lead.car && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-600 mb-3 bg-zinc-50/50 p-1.5 rounded-md border border-zinc-100 w-fit">
                        <Car className="h-3 w-3 text-zinc-400" />
                        <span className="truncate max-w-[200px]">{lead.car}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4">
                      <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border
                        ${lead.status === "no_answer"
                          ? "bg-zinc-50 text-zinc-500 border-zinc-200"
                          : lead.nextActionDate
                            ? (isPast(lead.nextActionDate) && !isToday(lead.nextActionDate)
                              ? "bg-red-50 text-red-600 border-red-100"
                              : isToday(lead.nextActionDate)
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-blue-50 text-blue-600 border-blue-100")
                            : "bg-zinc-50 text-zinc-500 border-zinc-200"
                        }
                      `}>
                        <Clock className="h-3 w-3" />
                        {lead.status === "no_answer"
                          ? (lead.createdAt ? format(typeof lead.createdAt === 'object' && lead.createdAt !== null && 'seconds' in lead.createdAt ? new Date((lead.createdAt as {seconds: number}).seconds * 1000) : new Date(lead.createdAt as string | number), "d MMM", { locale: ru }) : "—")
                          : lead.nextActionDate
                            ? (isToday(lead.nextActionDate)
                              ? "Сегодня " + format(lead.nextActionDate, "HH:mm")
                              : isTomorrow(lead.nextActionDate)
                              ? "Завтра " + format(lead.nextActionDate, "HH:mm")
                              : format(lead.nextActionDate, "d MMM, HH:mm", { locale: ru }))
                            : (lead.createdAt ? format(typeof lead.createdAt === 'object' && lead.createdAt !== null && 'seconds' in lead.createdAt ? new Date((lead.createdAt as {seconds: number}).seconds * 1000) : new Date(lead.createdAt as string | number), "d MMM yyyy", { locale: ru }) : "—")
                        }
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-400 hover:bg-red-50 hover:text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                        onClick={(e) => handleDelete(e, lead.id!)}
                        title="Удалить лида"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                }
              />
            ))}

            {column.items.length === 0 && (
              <div className="flex flex-col items-center justify-center p-6 text-sm text-zinc-400 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                Пусто
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
