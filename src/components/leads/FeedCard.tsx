"use client";

import React, { useState } from "react";
import { Lead } from "@/lib/types";
import { format, isYesterday, isToday } from "date-fns";
import { ru } from "date-fns/locale";
import { Copy, Phone, Car, Clock, ChevronDown, Check } from "lucide-react";
import { getSourceIcon } from "./Icons";
import { getStatusLabel, getStatusColor } from "@/lib/displayUtils";
import { updateLeadStatus, updateLeadDetails } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";

interface FeedCardProps {
  lead: Lead;
}

const formatLeadTime = (timestamp: number) => {
  const date = new Date(timestamp);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Вчера, " + format(date, "HH:mm");
  return format(date, "d MMM, HH:mm", { locale: ru });
};

export function FeedCard({ lead }: FeedCardProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [actionDate, setActionDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState<"visit" | "callback" | null>(null);

  const timestampToUse = lead.nextActionDate || (lead.status === "new" ? lead.createdAt : (lead.history[lead.history.length-1]?.changedAt || lead.updatedAt));
  const timeString = formatLeadTime(timestampToUse);

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(lead.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = async (newStatus: import("@/lib/types").LeadStatus) => {
    if (!user?.email || !lead.id) return;
    setIsSaving(true);
    try {
      if ((newStatus === "visit" || newStatus === "callback") && actionDate) {
        // Parse the local datetime string into a timestamp
        const nextActionTimestamp = new Date(actionDate).getTime();
        await updateLeadDetails(
          lead.id,
          { status: newStatus, nextActionDate: nextActionTimestamp },
          user.email,
          note.trim() || undefined
        );
      } else {
        await updateLeadStatus(lead.id, newStatus, user.email, note.trim() || undefined);
      }
      setNote("");
      setActionDate("");
      setShowDatePicker(null);
      setIsExpanded(false);
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-[12px] border transition-all duration-200 cursor-pointer overflow-hidden ${
        isExpanded ? "border-blue-200 shadow-md" : "border-zinc-200 shadow-soft hover:border-zinc-300 hover:shadow-md"
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Свернутый вид (Collapsed Header) */}
      <div className="flex items-center justify-between p-4 gap-4">

        {/* Time & Source */}
        <div className="flex flex-col gap-1 w-24 shrink-0">
          <span className={`text-xs font-bold ${lead.status === 'new' && isYesterday(new Date(timestampToUse)) ? 'text-red-500' : 'text-zinc-500'}`}>
            {timeString}
          </span>
          <div className="flex items-center gap-1.5 text-zinc-400">
            {getSourceIcon(lead.source)}
          </div>
        </div>

        {/* Info (Name, Auto) */}
        <div className="flex flex-col w-40 shrink-0 min-w-0">
          <span className="text-sm font-bold text-zinc-900 truncate">{lead.name || "Без имени"}</span>
          <div className="flex items-center gap-1 text-xs text-zinc-500 truncate">
            <Car className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.car || "Не указано"}</span>
          </div>
        </div>

        {/* ОГРОМНЫЙ НОМЕР ТЕЛЕФОНА */}
        <div className="flex-1 flex items-center gap-3">
          <div className="flex items-center gap-2 group">
            <span className="font-mono text-xl font-bold text-zinc-900 tracking-tight">
              {lead.phone}
            </span>
            <button
              onClick={handleCopyPhone}
              className="p-1.5 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 opacity-0 group-hover:opacity-100 transition-all"
              title="Копировать номер"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="w-32 shrink-0 flex justify-end items-center gap-3">
          <span className={`text-[11px] uppercase tracking-wide font-bold px-2.5 py-1 rounded-md border ${getStatusColor(lead.status)}`}>
            {getStatusLabel(lead.status)}
          </span>
          <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Раскрытый вид (Accordion Content) */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0 border-t border-zinc-100 bg-zinc-50/50 flex flex-col gap-4">

            {/* Рабочая зона: Заметка и Кнопки */}
            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <textarea
                  className="w-full h-full min-h-[100px] p-3 text-sm bg-white border border-zinc-200 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all placeholder:text-zinc-400"
                  placeholder="Новая заметка по разговору..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="w-48 flex flex-col gap-2 shrink-0">
                {showDatePicker === "visit" ? (
                  <div className="flex flex-col gap-1 bg-blue-50 p-2 rounded-[8px] border border-blue-100">
                    <label className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Дата приезда</label>
                    <input
                      type="datetime-local"
                      value={actionDate}
                      onChange={e => setActionDate(e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-blue-200"
                    />
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => setShowDatePicker(null)} className="flex-1 py-1 text-xs text-blue-700 hover:bg-blue-100 rounded">Отмена</button>
                      <button onClick={() => handleAction("visit")} disabled={!actionDate || isSaving} className="flex-1 py-1 text-xs bg-blue-600 text-white rounded disabled:opacity-50">Ок</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDatePicker("visit")}
                    disabled={isSaving}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-[8px] transition-colors shadow-sm disabled:opacity-50"
                  >
                    Назначить приезд
                  </button>
                )}

                {showDatePicker === "callback" ? (
                  <div className="flex flex-col gap-1 bg-zinc-100 p-2 rounded-[8px] border border-zinc-200">
                    <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Дата звонка</label>
                    <input
                      type="datetime-local"
                      value={actionDate}
                      onChange={e => setActionDate(e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-zinc-300"
                    />
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => setShowDatePicker(null)} className="flex-1 py-1 text-xs text-zinc-600 hover:bg-zinc-200 rounded">Отмена</button>
                      <button onClick={() => handleAction("callback")} disabled={!actionDate || isSaving} className="flex-1 py-1 text-xs bg-zinc-900 text-white rounded disabled:opacity-50">Ок</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDatePicker("callback")}
                    disabled={isSaving}
                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-[8px] transition-colors shadow-sm disabled:opacity-50"
                  >
                    Перезвонить
                  </button>
                )}

                <button
                  onClick={() => handleAction("refusal")}
                  disabled={isSaving || showDatePicker !== null}
                  className="w-full py-2 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-sm font-semibold rounded-[8px] transition-colors disabled:opacity-50"
                >
                  Отказ
                </button>
              </div>
            </div>

            {/* Timeline (История) */}
            {lead.history && lead.history.length > 0 && (
              <div className="mt-2 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">История</h4>
                <div className="flex flex-col gap-2">
                  {lead.history.slice().reverse().map((entry, idx) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      <div className="w-24 shrink-0 text-xs text-zinc-400 font-medium pt-0.5">
                        {format(new Date(entry.changedAt), "d MMM, HH:mm", { locale: ru })}
                      </div>
                      <div className="flex-1 bg-white border border-zinc-100 rounded-md p-2.5 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-zinc-700 text-xs">{entry.changedBy}</span>
                          <span className="text-zinc-400 text-xs">&rarr;</span>
                          <span className="font-bold text-[10px] uppercase text-zinc-500">{getStatusLabel(entry.status)}</span>
                        </div>
                        {entry.comment && (
                          <p className="text-zinc-600 text-sm leading-relaxed">{entry.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
