"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Lead } from "@/lib/types";
import { getStatusColor, getStatusLabel, getSourceLabel } from "@/lib/displayUtils";
import { Badge } from "@/components/ui/badge";
import { format, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { ReactElement, useState as useReactState, useEffect } from "react";
import { updateLeadStatus, deleteLead, updateLeadDetails } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadStatus } from "@/lib/types";
import { Trash2, Phone, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, User, FileText, Smartphone, Ban } from "lucide-react";

const safeFormatDate = (timestamp: unknown) => {
  if (!timestamp) return "—";

  let dateObj: Date;
  if (
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'seconds' in timestamp &&
    typeof (timestamp as { seconds: number }).seconds === 'number'
  ) {
    dateObj = new Date((timestamp as { seconds: number }).seconds * 1000);
  } else {
    dateObj = new Date(timestamp as string | number);
  }

  return isValid(dateObj) ? format(dateObj, "dd MMM yyyy, HH:mm", { locale: ru }) : "Некорректная дата";
};

export function LeadDrawer({ lead, trigger }: { lead: Lead; trigger: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const [note, setNote] = useState(lead.notes || "");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const { user } = useAuth();

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить этого лида?")) return;

    try {
      setIsDeleting(true);
      await deleteLead(lead.id!);
      setOpen(false);
    } catch (error) {
      console.error("Error deleting lead:", error);
      alert("Ошибка при удалении");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: string | null) => {
    if (!user || !newStatus || newStatus === lead.status) return;

    try {
      setIsUpdatingStatus(true);
      await updateLeadStatus(lead.id!, newStatus as LeadStatus, user.email || "Unknown");
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Ошибка при обновлении статуса");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const newDate = val ? new Date(val).getTime() : null;

    try {
      setIsUpdatingDate(true);
      await updateLeadDetails(lead.id!, { nextActionDate: newDate });
    } catch (error) {
      console.error("Error updating date:", error);
      alert("Ошибка при обновлении даты");
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const saveNote = async () => {
    if (note === lead.notes) return;
    try {
      setIsSavingNote(true);
      await updateLeadDetails(lead.id!, { notes: note });
    } catch (error) {
      console.error("Error saving note", error);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleTerminalAction = async (status: LeadStatus) => {
    if (!user) return;
    try {
      setIsUpdatingStatus(true);
      await updateLeadStatus(lead.id!, status, user.email || "Unknown");
      setOpen(false); // Close drawer on terminal actions
    } catch (error) {
      console.error("Error setting terminal status:", error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formattedActionDate = lead.nextActionDate
    ? format(new Date(lead.nextActionDate), "yyyy-MM-dd'T'HH:mm")
    : "";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent className="sm:max-w-[500px] w-full overflow-y-auto p-0 border-l border-zinc-200">

        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 bg-white sticky top-0 z-10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 mb-1">{lead.name}</h2>
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {lead.phone}</span>
                <span className="text-zinc-300">•</span>
                <span className="capitalize">{getSourceLabel(lead.source)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">

          {/* Status & Next Action Panel */}
          <div className="bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Текущий этап</label>
                <Select disabled={isUpdatingStatus} value={lead.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className={`w-full font-medium ${getStatusColor(lead.status)} border-transparent focus:ring-zinc-900 focus:ring-offset-0`}>
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Новый</SelectItem>
                    <SelectItem value="in_progress">В работе</SelectItem>
                    <SelectItem value="visit">Ждем приезда</SelectItem>
                    <SelectItem value="no_answer">Недозвон</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" /> След. контакт
                </label>
                <input
                  type="datetime-local"
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900"
                  value={formattedActionDate}
                  onChange={handleDateChange}
                  disabled={isUpdatingDate}
                />
              </div>
            </div>

            <div className="mt-5 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Заметки менеджера
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={saveNote}
                className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 min-h-[80px] resize-y"
                placeholder="Например: передал лизингу, ждем одобрения..."
              />
              {isSavingNote && <span className="text-xs text-zinc-400">Сохранение...</span>}
            </div>
          </div>

          {/* Quick Terminal Actions */}
          {lead.status !== "success" && lead.status !== "refusal" && lead.status !== "bank_refusal" && lead.status !== "spam" && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                onClick={() => handleTerminalAction("success")}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Оформился
              </Button>
              <Button
                variant="outline"
                className="w-full bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 transition-colors"
                onClick={() => handleTerminalAction("refusal")}
              >
                <XCircle className="h-4 w-4 mr-2" /> Отказ
              </Button>
            </div>
          )}

          {/* Parsed Payload Data (Aнкета) */}
          {lead.payload && Object.keys(lead.payload).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-zinc-400" /> Данные анкеты
              </h3>
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-3 gap-x-4 gap-y-3 p-4 text-sm">
                  <div className="col-span-1 text-zinc-500 font-medium">Желаемое авто</div>
                  <div className="col-span-2 text-zinc-900 font-medium">{lead.car || "Не указано"}</div>

                  {Object.entries(lead.payload).map(([key, value]) => {
                    // Filter out duplicate or unneeded raw info that is already standard
                    if (["name", "phone", "car", "source", "notes", "createdAt", "updatedAt"].includes(key)) return null;
                    return (
                      <React.Fragment key={key}>
                        <div className="col-span-1 text-zinc-500 font-medium capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="col-span-2 text-zinc-900 break-words">{String(value)}</div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Timeline History */}
          {lead.history && lead.history.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-400" /> История событий
              </h3>
              <div className="relative pl-4 space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-zinc-200 before:via-zinc-200 before:to-transparent">
                {lead.history.slice().reverse().map((entry, i) => (
                  <div key={i} className="relative flex items-start group">
                    <div className="absolute left-0 w-2.5 h-2.5 rounded-full bg-zinc-200 border-2 border-white translate-x-[-4px] mt-1.5 ring-4 ring-white" />
                    <div className="pl-6 w-full">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[13px] font-medium text-zinc-900">{getStatusLabel(entry.status)}</span>
                        <span className="text-xs text-zinc-500">{safeFormatDate(entry.changedAt)}</span>
                      </div>
                      {entry.comment && <p className="text-[13px] text-zinc-600 mb-1">{entry.comment}</p>}
                      <p className="text-[11px] text-zinc-400">{entry.changedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-8 flex justify-end">
             <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Ban className="h-4 w-4 mr-2" /> Безвозвратно удалить лида
              </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
