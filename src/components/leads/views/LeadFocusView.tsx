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
        className="absolute inset-0 bg-black/5 backdrop-blur-sm animate-in fade-in duration-300 hidden md:block"
        onClick={onClose} 
      />

      {/* Main Sheet Container */}
      <div className="relative w-full md:w-[900px] h-full bg-white md:shadow-2xl md:border-l border-border/40 z-50 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden animate-in fade-in-0 slide-in-from-right-8 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pb-24 md:pb-0 md:rounded-l-[24px]">

      {/* Left Pane - Main Edit */}
      <div className="flex-1 flex flex-col md:h-full bg-white md:border-r border-border/60 md:overflow-y-auto custom-scrollbar shrink-0">

        {/* Header Bar */}
        <div className="flex-none h-14 border-b border-border/40 flex items-center justify-between px-3 md:px-6 bg-[#F9FAFB]/80 backdrop-blur-md sticky top-0 md:relative z-30">
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" onClick={onClose} className="text-zinc-600 hover:text-zinc-900 hover:bg-white -ml-2 px-2 md:px-3 flex items-center gap-1 h-auto py-2 rounded-[8px]">
              <ChevronLeft className="w-5 h-5 -ml-1 stroke-[1.5]" />
              <span className="text-[14px] font-medium md:text-[13px]">Назад</span>
            </Button>
            <div className="w-px h-4 bg-zinc-200 hidden md:block" />
            <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-semibold tracking-wider uppercase text-zinc-500 bg-white border border-border/60 px-2.5 py-1 rounded-[6px] shadow-sm">
              <SourceIcon source={lead.source} className="w-3 md:w-3 h-3 md:h-3 stroke-[1.5]" /> <span className="hidden sm:inline">{getSourceLabel(lead.source)}</span>
            </div>
            <span className="text-[10px] md:text-[11px] text-zinc-400 font-mono tracking-wider ml-1">#{lead.id?.slice(-6)}</span>
          </div>

          <Button onClick={handleDelete} variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-destructive hover:bg-destructive/5 rounded-[8px]" title="Удалить лида">
            <Trash2 className="w-4 h-4 stroke-[1.5]" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 md:p-8 max-w-3xl mx-auto w-full space-y-6 md:space-y-8">

          {/* Header Info */}
          <div>
            <input
              value={formData.name}
              onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
              className="text-[26px] sm:text-3xl md:text-3xl font-bold text-zinc-900 w-full bg-transparent border-none outline-none transition-colors placeholder:font-medium placeholder:text-zinc-300 placeholder:italic"
              placeholder="Без имени"
            />

            <div className="mt-2 flex items-center gap-4">
              <div
                className="flex items-center gap-2 bg-zinc-50/50 hover:bg-zinc-50 border border-border/60 px-3 py-1.5 rounded-[8px] cursor-pointer transition-all duration-300 ease-out group"
                onClick={() => {
                  if(formData.phone) {
                    navigator.clipboard.writeText(formData.phone);
                    setCopied(true); setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                <Phone className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 stroke-[1.5]" />
                <input
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({...prev, phone: formatPhone(e.target.value)}))}
                  className="font-mono text-base md:text-[15px] font-medium bg-transparent outline-none w-32 md:w-40 text-zinc-800"
                  placeholder="Нет телефона"
                />
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500 stroke-[1.5]" /> : <Copy className="w-4 h-4 text-zinc-300 opacity-0 group-hover:opacity-100 stroke-[1.5] transition-opacity" />}
              </div>
            </div>
          </div>

          <div className="h-px bg-border/40 w-full" />

          {/* Core Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 md:gap-y-8">

            <div className="space-y-3">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 stroke-[1.5]" /> Статус
              </label>
              <StatusDropdown
                value={formData.status}
                onChange={(status) => setFormData(prev => ({...prev, status}))}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 stroke-[1.5]" /> Запланировано на
                {requiresNextAction && <span className="text-destructive">*</span>}
              </label>
              <input
                type="datetime-local"
                className="flex h-11 md:h-10 w-full rounded-[10px] md:rounded-[8px] border border-border/60 bg-transparent px-3 py-2 text-[15px] md:text-[14px] font-medium text-zinc-900 shadow-sm focus-visible:ring-2 focus-visible:ring-ring/20 outline-none transition-all duration-300 ease-out hover:border-border"
                value={isDateValid ? format(actionDateObj, "yyyy-MM-dd'T'HH:mm") : ""}
                onChange={e => {
                  const val = e.target.value;
                  if (!val) { setFormData(prev => ({ ...prev, nextActionDate: null })); return; }
                  const newDate = new Date(val);
                  if (isValid(newDate)) setFormData(prev => ({ ...prev, nextActionDate: newDate.getTime() }));
                }}
              />
            </div>

            <div className="space-y-3 col-span-2">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">Интересующий Автомобиль</label>
              <input
                value={formData.car}
                onChange={e => setFormData(prev => ({...prev, car: e.target.value}))}
                className="flex h-11 md:h-10 w-full rounded-[10px] md:rounded-[8px] border border-border/60 bg-transparent px-3 py-2 text-[15px] md:text-[14px] font-medium text-zinc-900 shadow-sm focus-visible:ring-2 focus-visible:ring-ring/20 outline-none transition-all duration-300 ease-out hover:border-border"
              />
            </div>

            <div className="space-y-3 col-span-2">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 stroke-[1.5]" /> Заметки
              </label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({...prev, notes: e.target.value}))}
                className="min-h-[140px] md:min-h-[160px] rounded-[10px] border-border/60 bg-zinc-50/50 focus:bg-white font-medium text-[15px] md:text-[14px] shadow-sm resize-y transition-all duration-300 ease-out hover:border-border"
                placeholder="Свободные заметки..."
              />
            </div>

          </div>

        </div>
      </div>

      {/* Right Pane - History & Meta */}
      <div className="w-full md:w-[400px] bg-[#F9FAFB] flex flex-col md:h-full shrink-0 relative">
        <div className="flex-none p-5 md:p-6 border-b border-border/40 bg-[#F9FAFB]">
          <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            Активность
            <span className="bg-white border border-border/60 text-zinc-500 px-2 py-0.5 rounded-[6px] shadow-sm">{lead.history?.length || 0}</span>
          </h3>
        </div>

        <div className="flex-1 overflow-visible md:overflow-y-auto p-5 md:p-6 custom-scrollbar">
          {lead.history && lead.history.length > 0 ? (
            <div className="relative border-l border-border ml-3 space-y-6 md:space-y-8 pb-4">
              {lead.history.map((event, i) => (
                <div key={i} className="relative pl-6">
                  <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-zinc-300 ring-4 ring-[#F9FAFB]" />
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={event.status} />
                      <span className="text-[11px] text-zinc-400 font-medium bg-white px-2 py-1 rounded-[6px] shadow-sm border border-border/60">
                        {format(new Date(event.changedAt), "d MMM yyyy, HH:mm", { locale: ru })}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-[6px] bg-white border border-border/60 flex items-center justify-center text-[10px] text-zinc-600 font-bold shadow-sm">{event.changedBy.charAt(0).toUpperCase()}</div>
                      {event.changedBy.split('@')[0]}
                    </div>
                    {event.comment && (
                      <div className="mt-1 text-[13px] text-zinc-700 bg-white p-3 md:p-4 rounded-[12px] border border-border/60 shadow-sm leading-relaxed">
                        {event.comment}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-zinc-400 gap-2">
              <Clock className="w-6 h-6 opacity-30 stroke-[1.5]" />
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-60">Нет активности</p>
            </div>
          )}

          {/* Meta Payload */}
          {lead.payload && Object.keys(lead.payload).filter(k => !["name", "phone", "car", "source", "notes"].includes(k)).length > 0 && (
            <div className="mt-8 mb-6 pt-6 border-t border-border/40">
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Технические данные</h3>
              <pre className="text-[11px] font-mono text-zinc-600 bg-white border border-border/60 rounded-[12px] p-4 overflow-x-auto shadow-sm leading-relaxed">
                {JSON.stringify(Object.fromEntries(
                  Object.entries(lead.payload).filter(([k]) => !["name", "phone", "car", "source", "notes"].includes(k))
                ), null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Save Footer Action - Fixed to bottom */}
        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 md:absolute p-4 md:p-6 bg-white/95 backdrop-blur-md border-t border-border/40 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] flex flex-col gap-3 z-[60]">
            {isNextActionMissing && (
              <p className="text-[11px] text-destructive font-semibold uppercase tracking-wider text-center px-2 animate-in slide-in-from-bottom-2">Укажите следующий шаг</p>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="w-full font-semibold h-12 text-[14px] shadow-sm disabled:opacity-50 transition-all duration-300 ease-out hover:shadow-md"
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
