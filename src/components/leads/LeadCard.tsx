"use client";

import { useState } from "react";
import { Lead, LeadStatus } from "@/types/lead";
import { Button } from "@/components/ui/button";
import { Copy, Clock, MessageSquare, Car, Pencil } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { SourceBadge } from "./SourceBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onQuickStatusChange: (id: string, newStatus: LeadStatus) => void;
  isOverdue?: boolean;
}

export function LeadCard({ lead, onEdit, onQuickStatusChange, isOverdue }: LeadCardProps) {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(lead.phone);
    toast.success("Номер скопирован");
  };

  const getQuickActions = () => {
    switch (lead.status) {
      case "new":
        return [
          { label: "Связались", status: "contacted" as LeadStatus },
          { label: "Мусор", status: "trash" as LeadStatus },
        ];
      case "contacted":
        return [
          { label: "Отказ", status: "refused" as LeadStatus },
          { label: "Сделка", status: "deal" as LeadStatus },
        ];
      case "callback":
      case "visit_planned":
        return [
          { label: "Приехал", status: "visited" as LeadStatus },
          { label: "Не отвечает", status: "no_answer" as LeadStatus },
        ];
      default:
        return [];
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow relative flex flex-col",
        isOverdue ? "border-red-300 ring-1 ring-red-300" : "border-gray-200"
      )}
    >
      {isOverdue && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-xl" />
      )}

      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg text-gray-900 truncate pr-2">{lead.name}</h3>
        <StatusBadge status={lead.status} />
      </div>

      <div className="flex items-center text-gray-600 mb-3 group w-fit">
        <span className="font-medium text-gray-800 mr-2">{lead.phone}</span>
        <button
          onClick={handleCopyPhone}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          title="Копировать номер"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 mb-4 text-sm text-gray-600 flex-1">
        {lead.carInterest && (
          <div className="flex items-start gap-2">
            <Car className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
            <span className="truncate">{lead.carInterest}</span>
          </div>
        )}

        {lead.plannedDate && (
          <div className={cn("flex items-start gap-2", isOverdue && "text-red-600 font-medium")}>
            <Clock className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {format(lead.plannedDate.toDate(), "d MMM, HH:mm", { locale: ru })}
              {isOverdue && " (Просрочено)"}
            </span>
          </div>
        )}

        {lead.notes && (
          <div
            className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-1 -ml-1 rounded transition-colors"
            onClick={() => setIsNotesExpanded(!isNotesExpanded)}
          >
            <MessageSquare className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
            <span className={cn(
              "text-gray-700",
              !isNotesExpanded && "line-clamp-2"
            )}>
              {lead.notes}
            </span>
          </div>
        )}
      </div>

      <div className="mt-auto">
        <div className="flex justify-between items-center mb-3">
          <SourceBadge source={lead.source} />
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-3">
          {getQuickActions().map((action) => (
            <Button
              key={action.status}
              variant="outline"
              size="sm"
              className="text-xs h-8 bg-gray-50 hover:bg-gray-100"
              onClick={() => onQuickStatusChange(lead.id, action.status)}
            >
              {action.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8 ml-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => onEdit(lead)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Изменить
          </Button>
        </div>
      </div>
    </div>
  );
}
