"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Lead } from "@/lib/types";
import { updateLeadStatus } from "@/lib/leadService";
import { Copy, CheckCircle2, XCircle, CalendarClock, Car, DollarSign, RefreshCcw } from "lucide-react";
import { getSourceIcon } from "./Icons";
import { DatePickerButton } from "./DatePickerButton";
import { useAuth } from "@/contexts/AuthContext";

interface LeadWorkspaceProps {
  lead: Lead;
}

export function LeadWorkspace({ lead }: LeadWorkspaceProps) {
  const [noteText, setNoteText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();

  const sourceIcon = getSourceIcon(lead.source || "unknown");

  const copyPhone = () => {
    if (lead.phone) {
      navigator.clipboard.writeText(lead.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAction = async (actionType: "schedule_call" | "schedule_visit" | "reject", selectedDate?: Date) => {
    if (!lead.id) return;
    setIsUpdating(true);
    try {
      let newStatus = lead.status;
      let nextActionDate: number | null | undefined = lead.nextActionDate;

      if (actionType === "schedule_call") {
        newStatus = "callback";
        nextActionDate = selectedDate ? selectedDate.getTime() : Date.now();
      } else if (actionType === "schedule_visit") {
        newStatus = "visit";
        nextActionDate = selectedDate ? selectedDate.getTime() : Date.now();
      } else if (actionType === "reject") {
        newStatus = "refusal";
        nextActionDate = null;
      }

      const userEmail = user?.email || "Пользователь";
      const comment = noteText.trim() ? `[${lead.status} -> ${newStatus}] ${noteText.trim()}` : `Изменен статус: ${lead.status} -> ${newStatus}`;

      // Use updateLeadStatus for all logic, it already handles history pushing.
      // We also update nextActionDate inside it.
      await updateLeadStatus(lead.id, newStatus, userEmail, comment, nextActionDate);

      setNoteText("");
    } catch (error) {
      console.error("Failed to update lead", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header / Client Info */}
      <div className="flex-none p-6 border-b border-gray-200 bg-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900">{lead.name || "Без имени"}</h2>
              <div className="flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium gap-1.5 [&_svg]:w-3.5 [&_svg]:h-3.5">
                {sourceIcon}
                <span className="capitalize">{lead.source || "Неизвестно"}</span>
              </div>
            </div>

            <div className="group flex items-center gap-3">
              <span className="text-[32px] font-mono font-bold text-gray-900 tracking-tight leading-none">
                {lead.phone}
              </span>
              <button
                onClick={copyPhone}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Копировать номер"
              >
                {copied ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Client Data Grid */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs font-semibold uppercase">
              <Car className="w-4 h-4" /> Авто
            </div>
            <div className="font-medium text-gray-900">{lead.car || "Не указано"}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs font-semibold uppercase">
              <DollarSign className="w-4 h-4" /> Бюджет
            </div>
            <div className="font-medium text-gray-900">{(lead.payload?.budget as string) || "Не указано"}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs font-semibold uppercase">
              <RefreshCcw className="w-4 h-4" /> Трейд-ин
            </div>
            <div className="font-medium text-gray-900">{(lead.payload?.tradeIn as string) || "Не указано"}</div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex-none p-4 bg-gray-50 border-b border-gray-200 flex gap-3">
        <DatePickerButton
          icon={<Car className="w-4 h-4" />}
          label="Назначить приезд"
          onSelect={(date) => handleAction("schedule_visit", date)}
          disabled={isUpdating}
          className="flex-1 bg-white hover:bg-blue-50 text-blue-700 border-blue-200"
        />
        <DatePickerButton
          icon={<CalendarClock className="w-4 h-4" />}
          label="Запланировать звонок"
          onSelect={(date) => handleAction("schedule_call", date)}
          disabled={isUpdating}
          className="flex-1 bg-white hover:bg-green-50 text-green-700 border-green-200"
        />
        <button
          onClick={() => handleAction("reject")}
          disabled={isUpdating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" /> Отказ
        </button>
      </div>

      {/* Timeline & Notes */}
      <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar flex flex-col">
        {/* Note input area - fixed to top of timeline */}
        <div className="mb-8">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Оставьте новую заметку о звонке..."
            className="w-full min-h-[120px] p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-gray-900 placeholder-gray-400"
          />
        </div>

        {/* History Log */}
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            История
            <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
              {lead.history?.length || 0}
            </span>
          </h3>

          <div className="space-y-4">
            {(!lead.history || lead.history.length === 0) && (
              <div className="text-gray-400 text-sm italic text-center py-4">
                История пуста
              </div>
            )}

            {lead.history?.slice().reverse().map((entry, index) => (
              <div key={index} className="relative pl-6 border-l-2 border-gray-100 pb-2">
                <div className="absolute w-2.5 h-2.5 bg-gray-200 rounded-full -left-[6px] top-1.5 ring-4 ring-white" />
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-500">
                    {format(new Date(entry.changedAt), "d MMM, HH:mm", { locale: ru })}
                  </span>
                  <span className="text-xs text-gray-400">&bull;</span>
                  <span className="text-xs font-medium text-gray-600">
                    Статус: {entry.status}
                  </span>
                </div>
                {entry.comment && (
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg mt-2 border border-gray-100 whitespace-pre-wrap">
                    {entry.comment}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
