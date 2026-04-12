"use client";

import { Lead, LeadStatus } from "@/lib/types";
import { getStatusColor, getStatusLabel, getSourceLabel } from "@/lib/displayUtils";
import { LEAD_STATUSES } from "@/constants/leadStatuses";
import { format, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import React, { useState, useEffect } from "react";
import { updateLeadStatus, updateLeadDetails, deleteLead } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Phone, Calendar as CalendarIcon, Clock, MapPin, FileText, Smartphone, Globe, Trash2, Search, CheckCircle2, Copy, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";

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

const SourceBadge = ({ source }: { source: string }) => {
  let icon = <Search className="w-3.5 h-3.5" />;
  let label = getSourceLabel(source);
  let bgClass = "bg-zinc-100 text-zinc-700";

  switch (source) {
    case 'instagram':
      icon = <InstagramIcon className="w-3.5 h-3.5 text-pink-600" />;
      bgClass = "bg-pink-50 text-pink-700 ring-1 ring-pink-100";
      break;
    case 'tiktok':
      icon = <TikTokIcon className="w-3.5 h-3.5 text-zinc-900" />;
      bgClass = "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200";
      break;
    case 'site':
      icon = <Globe className="w-3.5 h-3.5 text-blue-600" />;
      bgClass = "bg-blue-50 text-blue-700 ring-1 ring-blue-100";
      break;
    case 'telegram':
      icon = <TelegramIcon className="w-3.5 h-3.5 text-sky-500" />;
      bgClass = "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
      break;
  }

  return (
    <div className={`flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs capitalize ${bgClass}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
};


import { Pencil } from "lucide-react";

export function LeadDetails({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  const [formData, setFormData] = useState({
    name: lead.name,
    phone: lead.phone,
    car: lead.car || "",
    notes: lead.notes || "",
    status: lead.status,
    nextActionDate: lead.nextActionDate,
  });
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const email = user?.email || "Unknown";

      if (formData.status !== lead.status) {
         await updateLeadStatus(lead.id!, formData.status, email);
      }

      await updateLeadDetails(
        lead.id!,
        {
          name: formData.name,
          phone: formData.phone,
          car: formData.car,
          notes: formData.notes,
          nextActionDate: formData.nextActionDate,
        }
      );
    } catch (error) {
      console.error("Error saving lead:", error);
      alert("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTerminal = async (status: 'success' | 'refusal') => {
    try {
      setIsSaving(true);
      await updateLeadStatus(lead.id!, status, user?.email || "Unknown");
      onClose(); // maybe close or keep open, let's keep open
    } catch(err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  const handleDelete = async () => {
    if(!confirm("Удалить лида безвозвратно?")) return;
    try {
       await deleteLead(lead.id!);
       onClose();
    } catch(err) {
       console.error(err);
    }
  }

  const formattedActionDate = formData.nextActionDate && isValid(formData.nextActionDate)
    ? format(formData.nextActionDate, "yyyy-MM-dd'T'HH:mm")
    : "";

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const newDate = val ? new Date(val).getTime() : null;
    setFormData(prev => ({ ...prev, nextActionDate: newDate }));
  };

  const isTerminal = lead.status === 'success' || lead.status === 'refusal' || lead.status === 'bank_refusal' || lead.status === 'spam';
  const hasChanges = JSON.stringify({
    name: formData.name, phone: formData.phone, car: formData.car, notes: formData.notes, status: formData.status, nextActionDate: formData.nextActionDate
  }) !== JSON.stringify({
    name: lead.name, phone: lead.phone, car: lead.car || "", notes: lead.notes || "", status: lead.status, nextActionDate: lead.nextActionDate
  });

  const handlePhoneClick = () => {
    if (!formData.phone) return;

    // Check if device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = `tel:${formData.phone.replace(/[^0-9+]/g, '')}`;
    } else {
      navigator.clipboard.writeText(formData.phone).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl shadow-sm border border-zinc-200/60 overflow-hidden relative">
      {/* Header Info */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-zinc-100 bg-white z-10 flex-shrink-0 flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-2 sm:pr-4">
          <div className="flex items-center gap-3 w-full group">
            {isEditingName ? (
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingName(false); }}
                autoFocus
                className="text-xl sm:text-3xl font-extrabold text-zinc-900 px-2 h-auto w-full"
              />
            ) : (
              <>
                <h2 className="text-xl sm:text-3xl font-extrabold text-zinc-900 truncate">
                  {formData.name || "Без имени"}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-zinc-400 hover:text-zinc-700"
                  onClick={() => setIsEditingName(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3">
             <div className="flex items-center group/phone relative">
               {isEditingPhone ? (
                 <Input
                   value={formData.phone}
                   onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))}
                   onBlur={() => setIsEditingPhone(false)}
                   onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingPhone(false); }}
                   autoFocus
                   placeholder="+375..."
                   className="h-8 text-sm w-40"
                 />
               ) : (
                 <div
                   onClick={handlePhoneClick}
                   className="flex items-center gap-2 text-zinc-600 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100 cursor-pointer hover:bg-zinc-100 transition-colors shrink-0"
                   title="Нажмите, чтобы скопировать или позвонить"
                 >
                   <Phone className="w-4 h-4 text-zinc-400 group-hover/phone:text-blue-500 transition-colors" />
                   <span className="text-sm font-medium whitespace-nowrap">
                     {formData.phone || "Без телефона"}
                   </span>
                   {copied ? (
                     <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-1" />
                   ) : (
                     <Copy className="w-3.5 h-3.5 text-zinc-300 opacity-0 group-hover/phone:opacity-100 transition-opacity ml-1" />
                   )}
                   {copied && (
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                       Скопировано
                     </div>
                   )}
                 </div>
               )}
               {!isEditingPhone && (
                 <Button
                   variant="ghost"
                   size="icon"
                   className="opacity-0 group-hover/phone:opacity-100 transition-opacity h-8 w-8 ml-1 text-zinc-400 hover:text-zinc-700"
                   onClick={() => setIsEditingPhone(true)}
                   title="Редактировать телефон"
                 >
                   <Pencil className="h-3.5 w-3.5" />
                 </Button>
               )}
             </div>

             <SourceBadge source={lead.source} />
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="ml-auto text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full mb-2">
              <X className="w-5 h-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleDelete} className="ml-auto text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-full">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area - 2 Column Dashboard */}
      <div className="flex-1 overflow-hidden flex flex-col sm:flex-row bg-zinc-50/30">

        {/* Left Column - History & Metadata */}
        <div className="w-full sm:w-[35%] lg:w-[30%] border-r border-zinc-200 flex flex-col overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <MapPin className="h-4 w-4 text-blue-500" /> Статус заявки
              </label>
              <Select value={formData.status} onValueChange={(val) => setFormData(prev => ({...prev, status: val as LeadStatus}))}>
                <SelectTrigger className={`w-full !h-[48px] box-border rounded-2xl font-semibold text-sm ${getStatusColor(formData.status)} border-transparent shadow-sm focus:ring-blue-500`}>
                  <SelectValue>{LEAD_STATUSES.find(s => s.value === formData.status)?.label || formData.status}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <CalendarIcon className="h-4 w-4 text-purple-500" /> След. контакт
              </label>
              <input
                type="datetime-local"
                disabled={isTerminal}
                className="flex h-[48px] box-border w-full rounded-2xl border-0 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 transition-all focus:ring-2 focus:ring-inset focus:ring-purple-500 disabled:opacity-50"
                value={formattedActionDate}
                onChange={handleDateChange}
              />
            </div>

            {/* Vertical Timeline */}
            {lead.history && lead.history.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-zinc-200">
                <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2 ml-1">
                  <Clock className="w-4 h-4 text-zinc-400" /> История
                </h3>
                <div className="flex flex-col gap-3">
                  {lead.history.map((event, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm flex flex-col relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${getStatusColor(event.status)}`}>
                          {getStatusLabel(event.status)}
                        </span>
                        <span className="text-zinc-400 text-[10px] font-bold">{safeFormatDate(event.changedAt)}</span>
                      </div>
                      {event.comment && (
                        <p className="text-xs text-zinc-600 leading-relaxed mt-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                          {event.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unstructured Payload */}
            {lead.payload && Object.keys(lead.payload).filter(k => !["name", "phone", "car", "source", "notes"].includes(k)).length > 0 && (
              <div className="space-y-3 pt-4 border-t border-zinc-200">
                <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2 ml-1">
                  <Smartphone className="w-4 h-4 text-zinc-400" /> Данные интеграции
                </h3>
                <div className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm overflow-hidden">
                   <pre className="text-[10px] font-mono text-zinc-500 overflow-x-auto custom-scrollbar pb-2">
                     {JSON.stringify(Object.fromEntries(
                        Object.entries(lead.payload).filter(([k]) => !["name", "phone", "car", "source", "notes"].includes(k))
                     ), null, 2)}
                   </pre>
                </div>
              </div>
            )}
        </div>

        {/* Right Column - Work Area */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="space-y-2 shrink-0">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                 Желаемое авто
              </label>
              <Textarea
                value={formData.car}
                onChange={(e) => setFormData(prev => ({...prev, car: e.target.value}))}
                className="h-[80px] min-h-[80px] rounded-2xl border-zinc-200 bg-white shadow-sm font-medium focus-visible:ring-zinc-400 p-3 resize-none text-base"
              />
            </div>

            <div className="space-y-2 flex-1 flex flex-col pb-10">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <FileText className="h-4 w-4 text-amber-500" /> Заметки
              </label>
              <Textarea
                className="flex-1 min-h-[150px] rounded-2xl border-zinc-200 bg-white shadow-sm font-medium focus-visible:ring-zinc-400 p-4 resize-none text-base w-full h-full"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
              />
            </div>
        </div>

      </div>

      {/* Footer Action Bar */}
      {hasChanges && (
        <div className="absolute bottom-6 right-8 left-8 flex justify-end animate-in slide-in-from-bottom-4 z-20 pointer-events-none">
          <div className="bg-zinc-900 p-2 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto ring-1 ring-white/10">
            <span className="text-sm font-medium text-zinc-300 pl-4">Есть несохраненные изменения</span>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-white hover:bg-zinc-100 text-zinc-900 rounded-xl px-6 h-10 font-bold"
            >
              {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : null}
              Сохранить
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
