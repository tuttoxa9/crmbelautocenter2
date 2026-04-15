"use client";

import { Lead } from "@/lib/types";
import { format, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { Copy, CheckCircle2, Phone, Trash2, Clock, MapPin, Smartphone, FileText, LayoutList } from "lucide-react";
import { useState, useEffect } from "react";
import { getSourceLabel, getStatusLabel } from "@/lib/displayUtils";
import { SourceIcon, StatusBadge, getStatusConfig } from "../ui/LeadBadges";
import { updateLeadStatus, updateLeadDetails } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const LEAD_STATUSES: import("@/lib/types").LeadStatus[] = [
  "new", "in_progress", "thinking", "callback", "visit", "no_answer", "success", "refusal", "bank_refusal", "spam"
];

interface LeadFocusViewProps {
  lead: Lead | null;
  onClose: () => void;
}

export function LeadFocusView({ lead, onClose }: LeadFocusViewProps) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: "", phone: "", car: "", notes: "", status: "new" as import("@/lib/types").LeadStatus, nextActionDate: null as number | null
  });
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || "", phone: lead.phone || "", car: lead.car || "",
        notes: lead.notes || "", status: lead.status, nextActionDate: lead.nextActionDate || null
      });
    }
  }, [lead]);

  if (!lead) return null;

  const hasChanges =
    formData.name !== lead.name || formData.phone !== lead.phone ||
    formData.car !== lead.car || formData.notes !== lead.notes ||
    formData.status !== lead.status || formData.nextActionDate !== lead.nextActionDate;

  const handleSave = async () => {
    if (!lead.id || !user) return;
    setIsSaving(true);
    try {
      if (formData.status !== lead.status) {
        await updateLeadStatus(
          lead.id, formData.status, user.email || 'unknown',
          `Статус: ${getStatusLabel(lead.status)} ➔ ${getStatusLabel(formData.status)}`,
          formData.nextActionDate
        );
      }
      await updateLeadDetails(lead.id, {
        name: formData.name, phone: formData.phone, car: formData.car, notes: formData.notes,
        ...(formData.status === lead.status ? { nextActionDate: formData.nextActionDate } : {})
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) { setFormData(prev => ({ ...prev, nextActionDate: null })); return; }
    const date = new Date(val);
    if (isValid(date)) setFormData(prev => ({ ...prev, nextActionDate: date.getTime() }));
  };

  const formattedActionDate = formData.nextActionDate && isValid(new Date(formData.nextActionDate))
    ? format(new Date(formData.nextActionDate), "yyyy-MM-dd'T'HH:mm") : "";

  return (
    <div className="absolute inset-0 bg-white z-20 flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">

      {/* Left Pane - Main Edit */}
      <div className="flex-1 flex flex-col h-full bg-white border-r border-zinc-100 overflow-y-auto custom-scrollbar">

        {/* Header Bar */}
        <div className="flex-none h-14 border-b border-zinc-100 flex items-center justify-between px-6 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-500 hover:text-zinc-900 -ml-2">
              <LayoutList className="w-4 h-4 mr-1.5" /> Назад к списку
            </Button>
            <div className="w-px h-4 bg-zinc-200" />
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
              <SourceIcon source={lead.source} className="w-3.5 h-3.5" /> {getSourceLabel(lead.source)}
            </div>
            <span className="text-xs text-zinc-400 font-mono">ID: {lead.id?.slice(-6)}</span>
          </div>

          <Button variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-8 max-w-3xl mx-auto w-full space-y-8">

          {/* Header Info */}
          <div>
            <input
              value={formData.name}
              onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
              className="text-4xl font-black text-zinc-900 w-full bg-transparent border-none outline-none placeholder:text-zinc-300"
              placeholder="Имя клиента"
            />

            <div className="mt-4 flex items-center gap-4">
              <div
                className="flex items-center gap-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-md cursor-pointer transition-colors group"
                onClick={() => {
                  if(formData.phone) {
                    navigator.clipboard.writeText(formData.phone);
                    setCopied(true); setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                <Phone className="w-4 h-4 text-zinc-400 group-hover:text-blue-500" />
                <input
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))}
                  className="font-mono text-lg font-bold bg-transparent outline-none w-40 text-zinc-800 placeholder:text-zinc-300"
                  placeholder="+375..."
                />
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-zinc-300 opacity-0 group-hover:opacity-100" />}
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-100 w-full" />

          {/* Core Fields Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Статус
              </label>
              <div className="flex flex-wrap gap-2">
                {LEAD_STATUSES.map(s => {
                  const isActive = formData.status === s;
                  const conf = getStatusConfig(s);
                  return (
                    <button
                      key={s}
                      onClick={() => setFormData(prev => ({...prev, status: s}))}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-all duration-200 ${
                        isActive ? `${conf.bg} ${conf.text} ${conf.border} shadow-sm ring-1 ring-${conf.text.split('-')[1]}-500/20` : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300'
                      }`}
                    >
                      {getStatusLabel(s)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Запланировано на
              </label>
              <input
                type="datetime-local"
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={formattedActionDate}
                onChange={handleDateChange}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Интересующий Автомобиль</label>
              <input
                value={formData.car}
                onChange={e => setFormData(prev => ({...prev, car: e.target.value}))}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm font-medium text-zinc-900 focus:bg-white focus:border-zinc-300 outline-none transition-colors"
                placeholder="Марка, модель, бюджет..."
              />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Заметки
              </label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({...prev, notes: e.target.value}))}
                className="min-h-[120px] rounded-md border-zinc-200 bg-amber-50/20 focus:bg-amber-50/40 focus:border-amber-200 font-medium text-sm shadow-inner"
                placeholder="Свободные заметки..."
              />
            </div>

          </div>

        </div>
      </div>

      {/* Right Pane - History & Meta */}
      <div className="w-full md:w-[380px] bg-zinc-50 border-l border-zinc-200 flex flex-col">
        <div className="flex-none p-4 border-b border-zinc-200 bg-zinc-100/50">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Активность</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {lead.history && lead.history.length > 0 ? (
            <div className="relative border-l border-zinc-200 ml-3 space-y-6 pb-4">
              {lead.history.map((event, i) => (
                <div key={i} className="relative pl-5">
                  <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-zinc-300 ring-4 ring-zinc-50" />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={event.status} />
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {format(new Date(event.changedAt), "d MMM yyyy, HH:mm", { locale: ru })}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">{event.changedBy}</span>
                    {event.comment && (
                      <div className="mt-1.5 text-xs text-zinc-700 bg-white p-2.5 rounded-md border border-zinc-200/60 shadow-sm">
                        {event.comment}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 text-center mt-10">Нет истории</p>
          )}

          {/* Meta Payload */}
          {lead.payload && Object.keys(lead.payload).filter(k => !["name", "phone", "car", "source", "notes"].includes(k)).length > 0 && (
            <div className="mt-8 pt-6 border-t border-zinc-200/60">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Smartphone className="w-3.5 h-3.5" /> Raw Data
              </h3>
              <pre className="text-[10px] font-mono text-zinc-500 bg-white p-3 rounded-md border border-zinc-200 overflow-x-auto">
                {JSON.stringify(Object.fromEntries(
                  Object.entries(lead.payload).filter(([k]) => !["name", "phone", "car", "source", "notes"].includes(k))
                ), null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Save Footer Action */}
        {hasChanges && (
          <div className="p-4 bg-white border-t border-zinc-200 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)]">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold h-10"
            >
              {isSaving ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}
