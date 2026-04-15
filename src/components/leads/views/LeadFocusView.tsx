"use client";

import { Lead } from "@/lib/types";
import { format, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { Copy, CheckCircle2, Phone, Trash2, Clock, MapPin, Smartphone, FileText, LayoutList, ChevronLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { formatPhone } from "@/lib/formatPhone";
import { getSourceLabel, getStatusLabel } from "@/lib/displayUtils";
import { SourceIcon, StatusBadge } from "../ui/LeadBadges";
import { StatusDropdown } from "../ui/StatusDropdown";
import { updateLeadStatus, updateLeadDetails, deleteLead } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_STATUSES } from "@/lib/types";

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

  // Per user request, setting the next action date is mandatory
  const terminalStatuses = ["success", "refusal", "bank_refusal", "spam", "new"];
  const requiresNextAction = !terminalStatuses.includes(formData.status);
  const isNextActionMissing = requiresNextAction && !formData.nextActionDate;
  const isSaveDisabled = isSaving || isNextActionMissing;

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

  const handleDelete = async () => {
    if (!lead?.id) return;
    if (window.confirm("Вы уверены, что хотите удалить этого лида? Это действие нельзя отменить.")) {
      try {
        await deleteLead(lead.id);
        onClose();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const actionDateObj = formData.nextActionDate ? new Date(formData.nextActionDate) : null;
  const isDateValid = actionDateObj && isValid(actionDateObj);

  return (
    <div className="absolute inset-0 z-40 flex md:justify-end overflow-hidden">
      {/* Desktop Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm animate-in fade-in duration-300 hidden md:block" 
        onClick={onClose} 
      />

      {/* Main Sheet Container */}
      <div className="relative w-full md:w-[900px] h-full bg-white md:shadow-2xl md:border-l border-white/20 z-50 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden animate-in fade-in-0 slide-in-from-right-8 duration-300 pb-20 md:pb-0 md:rounded-l-3xl">

      {/* Left Pane - Main Edit */}
      <div className="flex-1 flex flex-col md:h-full bg-white md:border-r border-zinc-100 md:overflow-y-auto custom-scrollbar shrink-0">

        {/* Header Bar */}
        <div className="flex-none h-14 border-b border-zinc-100 flex items-center justify-between px-3 md:px-6 bg-zinc-50/50 sticky top-0 md:relative z-30">
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" onClick={onClose} className="text-zinc-500 hover:text-zinc-900 -ml-2 px-2 md:px-3 flex items-center gap-1 h-auto py-2">
              <ChevronLeft className="w-6 h-6 -ml-1" />
              <span className="text-[15px] font-medium md:text-sm">Назад</span>
            </Button>
            <div className="w-px h-4 bg-zinc-200 hidden md:block" />
            <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
              <SourceIcon source={lead.source} className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden sm:inline">{getSourceLabel(lead.source)}</span>
            </div>
            <span className="text-[10px] md:text-xs text-zinc-400 font-mono">ID: {lead.id?.slice(-6)}</span>
          </div>

          <Button onClick={handleDelete} variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-red-600" title="Удалить лида">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6 md:space-y-8">

          {/* Header Info */}
          <div>
            <input
              value={formData.name}
              onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
              className="text-[26px] sm:text-3xl md:text-4xl font-extrabold text-zinc-900 w-full bg-transparent border-none outline-none transition-colors"
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
                  onChange={e => setFormData(prev => ({...prev, phone: formatPhone(e.target.value)}))}
                  className="font-mono text-base md:text-lg font-bold bg-transparent outline-none w-32 md:w-40 text-zinc-800"
                />
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-zinc-300 opacity-0 group-hover:opacity-100" />}
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-100 w-full" />

          {/* Core Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 md:gap-y-6">

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Статус
              </label>
              <StatusDropdown
                value={formData.status}
                onChange={(status) => setFormData(prev => ({...prev, status}))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Запланировано на
                {requiresNextAction && <span className="text-red-500">*</span>}
              </label>
              <input
                type="datetime-local"
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-colors"
                value={isDateValid ? format(actionDateObj, "yyyy-MM-dd'T'HH:mm") : ""}
                onChange={e => {
                  const val = e.target.value;
                  if (!val) { setFormData(prev => ({ ...prev, nextActionDate: null })); return; }
                  const newDate = new Date(val);
                  if (isValid(newDate)) setFormData(prev => ({ ...prev, nextActionDate: newDate.getTime() }));
                }}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Интересующий Автомобиль</label>
              <input
                value={formData.car}
                onChange={e => setFormData(prev => ({...prev, car: e.target.value}))}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm font-medium text-zinc-900 focus:bg-white focus:border-zinc-300 outline-none transition-colors"
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
      <div className="w-full md:w-[380px] bg-zinc-50 border-t md:border-t-0 md:border-l border-zinc-200 flex flex-col md:h-full md:overflow-y-auto shrink-0 relative">
        <div className="flex-none p-4 border-b border-zinc-200 bg-zinc-100/50">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Активность</h3>
        </div>

        <div className="flex-1 md:overflow-y-auto p-4 custom-scrollbar">
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
          <div className="fixed bottom-0 left-0 right-0 p-3 md:p-5 bg-white/90 backdrop-blur-lg border-t border-zinc-200/50 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.1)] flex flex-col gap-2 z-[60] md:sticky md:bottom-0 md:mt-auto md:w-full md:rounded-br-none">
            {isNextActionMissing && (
              <p className="text-[10px] md:text-xs text-red-600 font-medium text-center text-balance px-2 animate-in slide-in-from-bottom-2">Выберите дату (запланировано)</p>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg shadow-zinc-900/20 font-bold h-11 md:h-12 rounded-xl disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSaving ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </div>
        )}
      </div>

    </div>
    </div>
  );
}
