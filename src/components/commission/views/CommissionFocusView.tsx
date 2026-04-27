"use client";

import { Lead, LeadSource } from "@/lib/types";
import { format, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { Copy, CheckCircle2, Phone, Trash2, Clock, MapPin, Smartphone, FileText, ChevronLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { formatPhone } from "@/lib/formatPhone";
import { getSourceLabel, getStatusLabel } from "@/lib/displayUtils";
import { StatusBadge } from "../../leads/ui/LeadBadges";
import { CommissionStatusDropdown } from "../ui/CommissionStatusDropdown";
import { updateCommissionStatus, updateCommissionDetails, deleteCommission } from "@/lib/services/commission";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_STATUSES } from "@/lib/types";
import { CarPreview } from "../../leads/views/CarPreview";

interface CommissionFocusViewProps {
  lead: Lead | null;
  onClose: () => void;
}

export function CommissionFocusView({ lead, onClose }: CommissionFocusViewProps) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: "", phone: "", car: "", notes: "", status: "new" as import("@/lib/types").LeadStatus, nextActionDate: null as number | null,
    source: "call" as LeadSource
  });
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || "", phone: lead.phone || "", car: lead.car || "",
        notes: lead.notes || "", status: lead.status, nextActionDate: lead.nextActionDate || null,
        source: lead.source
      });
    }
  }, [lead]);

  if (!lead) return null;

  const hasChanges =
    formData.name !== lead.name || formData.phone !== lead.phone ||
    formData.car !== lead.car || formData.notes !== lead.notes ||
    formData.status !== lead.status || formData.nextActionDate !== lead.nextActionDate ||
    formData.source !== lead.source;

  const terminalStatuses = ["success", "refusal", "bank_refusal", "spam", "new"];
  const requiresNextAction = !terminalStatuses.includes(formData.status);
  const isNextActionMissing = requiresNextAction && !formData.nextActionDate;
  const isSaveDisabled = isSaving || isNextActionMissing;

  const handleSave = async () => {
    if (!lead.id || !user) return;
    setIsSaving(true);
    try {
      if (formData.status !== lead.status) {
        await updateCommissionStatus(
          lead.id, formData.status, user.email || 'unknown',
          `Статус: ${getStatusLabel(lead.status)} ➔ ${getStatusLabel(formData.status)}`,
          formData.nextActionDate
        );
      }
      await updateCommissionDetails(lead.id, {
        name: formData.name, phone: formData.phone, car: formData.car, notes: formData.notes,
        source: formData.source,
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
    if (window.confirm("Вы уверены, что хотите удалить эту запись? Это действие нельзя отменить.")) {
      try {
        await deleteCommission(lead.id);
        onClose();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const actionDateObj = formData.nextActionDate ? new Date(formData.nextActionDate) : null;
  const isDateValid = actionDateObj && isValid(actionDateObj);

  return (
    <div className="absolute inset-0 z-[100] flex justify-end overflow-hidden">
      <div 
        className="absolute inset-0 bg-zinc-900/30 backdrop-blur-md animate-in fade-in duration-500 hidden md:block" 
        onClick={onClose} 
      />

      <div className="relative w-full md:w-[900px] h-full bg-white/95 backdrop-blur-xl md:shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)] md:border-l border-zinc-200/50 z-50 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden animate-in fade-in-0 slide-in-from-right-16 duration-500 pb-20 md:pb-0 md:rounded-l-[2.5rem] overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>

      <div className="flex-1 flex flex-col md:h-full bg-transparent md:border-r border-zinc-100/50 md:overflow-y-auto custom-scrollbar shrink-0">

        <div className="flex-none h-14 border-b border-zinc-200/50 flex items-center justify-between px-3 md:px-6 bg-white/60 backdrop-blur-lg sticky top-0 z-30">
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" onClick={onClose} className="text-zinc-500 hover:text-zinc-900 -ml-2 px-2 md:px-3 flex items-center gap-1 h-auto py-2">
              <ChevronLeft className="w-6 h-6 -ml-1" />
              <span className="text-[15px] font-medium md:text-sm">Назад</span>
            </Button>
            <div className="w-px h-4 bg-zinc-200 hidden md:block" />

            <span className="text-[10px] md:text-xs text-zinc-400 font-mono hidden sm:inline">ID: {lead.id?.slice(-6)}</span>
          </div>

          <Button onClick={handleDelete} variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-red-600" title="Удалить запись">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6 md:space-y-8">

          <div>
            <input
              value={formData.name}
              onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
              className="text-[26px] sm:text-3xl md:text-4xl font-extrabold text-zinc-900 w-full bg-transparent border-none outline-none transition-colors"
            />

            <div className="mt-4 flex items-center gap-4">
              <div
                className="flex items-center gap-2 bg-zinc-100/50 hover:bg-zinc-100 border border-zinc-200/50 px-4 py-2 rounded-full cursor-pointer transition-colors group shadow-sm"
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
                  className="font-mono text-base md:text-lg font-bold bg-transparent outline-none text-zinc-800 min-w-0"
                  style={{ width: `${Math.max((formData.phone?.length || 1) + 1, 10)}ch` }}
                />
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-zinc-300 opacity-0 group-hover:opacity-100" />}
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-100 w-full" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 md:gap-y-6">

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Статус
              </label>
              <CommissionStatusDropdown
                value={formData.status}
                onChange={(status) => setFormData(prev => ({...prev, status}))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-1.5">
                <Clock className="w-3.5 h-3.5" /> Запланировано на
                {requiresNextAction && <span className="text-red-500">*</span>}
              </label>
              <input
                type="datetime-local"
                className="flex h-11 w-full rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-2 text-sm font-medium text-zinc-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:bg-white focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 outline-none transition-all"
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
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 inline-block">Ссылка на объявление</label>
              <input
                value={formData.car}
                onChange={e => setFormData(prev => ({...prev, car: e.target.value}))}
                className="flex h-11 w-full rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-2 text-sm font-medium text-zinc-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:bg-white focus:border-zinc-400 outline-none transition-all"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-1.5">
                <FileText className="w-3.5 h-3.5" /> Заметки
              </label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({...prev, notes: e.target.value}))}
                className="min-h-[120px] rounded-3xl border-orange-200/50 bg-orange-50/30 focus:bg-orange-50/60 focus:border-orange-300 font-medium text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-4 leading-relaxed"
                placeholder="Свободные заметки..."
              />
            </div>

          </div>

        </div>
      </div>

      <div className="w-full md:w-[380px] bg-zinc-50/50 border-t md:border-t-0 md:border-l border-zinc-200/50 flex flex-col md:h-full md:overflow-y-auto shrink-0 relative">
        <div className="flex-none p-4 border-b border-zinc-200/50 bg-transparent blur-backdrop-sm sticky top-0 z-10">
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

          {(lead.payload?.carId || (lead.notes && lead.notes.includes("belautocenter.by/catalog/"))) ? (
            <CarPreview 
              carId={lead.payload?.carId as string | undefined} 
              url={lead.notes?.match(/https:\/\/belautocenter\.by\/catalog\/[a-zA-Z0-9_-]+/)?.[0]} 
            />
          ) : (
            lead.payload && Object.keys(lead.payload).filter(k => !["name", "phone", "car", "source", "notes"].includes(k)).length > 0 && (
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
            )
          )}
        </div>

        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white/70 backdrop-blur-2xl border-t border-zinc-200/50 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.1)] flex flex-col gap-3 z-[60] md:sticky md:bottom-0 md:mt-auto md:w-full md:rounded-br-none">
            {isNextActionMissing && (
              <p className="text-[10px] md:text-xs text-red-600 font-medium text-center text-balance px-2 animate-in slide-in-from-bottom-2">Выберите дату (запланировано)</p>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] font-semibold h-12 md:h-14 rounded-full disabled:opacity-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] tracking-wide"
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
