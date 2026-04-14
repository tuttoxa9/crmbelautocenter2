"use client";

import { Lead, LeadStatus } from "@/lib/types";
import { format, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { Copy, CheckCircle2, Phone, X, Pencil, Trash2, Clock, CalendarIcon, FileText, Smartphone, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { getStatusColor, getStatusLabel, getSourceLabel } from "@/lib/displayUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";
import { updateLeadStatus, updateLeadDetails, deleteLead } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";

interface LeadDetailsProps {
  lead: Lead;
  onClose?: () => void;
}

const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Новый" },
  { value: "in_progress", label: "В работе" },
  { value: "thinking", label: "Думает" },
  { value: "callback", label: "Перезвонить" },
  { value: "visit", label: "Приезд" },
  { value: "no_answer", label: "Недозвон" },
  { value: "success", label: "Оформился/купил" },
  { value: "refusal", label: "Отказ" },
  { value: "bank_refusal", label: "Отказ банка" },
  { value: "spam", label: "Брак/Тест" },
];

const SourceBadge = ({ source }: { source: string }) => {
  const getIcon = () => {
    switch (source) {
      case 'instagram': return <InstagramIcon className="w-4 h-4 text-pink-600" />;
      case 'tiktok': return <TikTokIcon className="w-4 h-4 text-black" />;
      case 'telegram': return <TelegramIcon className="w-4 h-4 text-sky-500" />;
      default: return null;
    }
  };
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 rounded-lg text-xs font-medium text-zinc-600">
      {getIcon()}
      {getSourceLabel(source)}
    </div>
  );
};

export function LeadDetails({ lead, onClose }: LeadDetailsProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: lead.name || "",
    phone: lead.phone || "",
    car: lead.car || "",
    notes: lead.notes || "",
    status: lead.status,
    nextActionDate: lead.nextActionDate,
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isTerminal = ["success", "refusal", "bank_refusal", "spam"].includes(formData.status);

  const hasChanges =
    formData.name !== lead.name ||
    formData.phone !== lead.phone ||
    formData.car !== lead.car ||
    formData.notes !== lead.notes ||
    formData.status !== lead.status ||
    formData.nextActionDate !== lead.nextActionDate;

  useEffect(() => {
    setFormData({
      name: lead.name || "",
      phone: lead.phone || "",
      car: lead.car || "",
      notes: lead.notes || "",
      status: lead.status,
      nextActionDate: lead.nextActionDate,
    });
  }, [lead]);

  const handlePhoneClick = () => {
    if (!formData.phone) return;
    navigator.clipboard.writeText(formData.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      setFormData(prev => ({ ...prev, nextActionDate: null }));
      return;
    }
    const date = new Date(val);
    if (isValid(date)) {
      setFormData(prev => ({ ...prev, nextActionDate: date.getTime() }));
    }
  };

  const handleSave = async () => {
    if (!lead.id || !user) return;
    setIsSaving(true);
    try {
      if (formData.status !== lead.status) {
        await updateLeadStatus(
          lead.id,
          formData.status,
          user.email || 'unknown',
          `Статус изменен с ${getStatusLabel(lead.status)} на ${getStatusLabel(formData.status)}`,
          formData.nextActionDate
        );
      }
      await updateLeadDetails(lead.id, {
        name: formData.name,
        phone: formData.phone,
        car: formData.car,
        notes: formData.notes,
        ...(formData.status === lead.status ? { nextActionDate: formData.nextActionDate } : {})
      });
    } catch (error) {
      console.error("Failed to save lead:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lead.id || !confirm("Удалить этот лид навсегда?")) return;
    setIsDeleting(true);
    try {
      await deleteLead(lead.id);
      if (onClose) onClose();
    } catch (error) {
      console.error("Failed to delete lead:", error);
      setIsDeleting(false);
    }
  };

  const safeFormatDate = (ts?: number | null) => {
    if (!ts) return "";
    const d = new Date(ts);
    return isValid(d) ? format(d, "d MMM yyyy, HH:mm", { locale: ru }) : "";
  };

  const formattedActionDate = formData.nextActionDate && isValid(new Date(formData.nextActionDate))
    ? format(new Date(formData.nextActionDate), "yyyy-MM-dd'T'HH:mm")
    : "";

  return (
    <div className="flex flex-col h-full bg-white text-zinc-900 font-sans">

      {/* Header */}
      <div className="flex-none p-6 border-b border-zinc-100 flex items-start justify-between bg-zinc-50/50">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-3 group">
            {isEditingName ? (
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={e => { if (e.key === 'Enter') setIsEditingName(false); }}
                autoFocus
                placeholder="Имя..."
                className="text-2xl font-bold h-10 w-full max-w-sm"
              />
            ) : (
              <>
                <h2 className="text-2xl font-black truncate">{formData.name || "Без имени"}</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400">
                  <Pencil className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
             {isEditingPhone ? (
               <Input
                 value={formData.phone}
                 onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))}
                 onBlur={() => setIsEditingPhone(false)}
                 onKeyDown={e => { if (e.key === 'Enter') setIsEditingPhone(false); }}
                 autoFocus
                 placeholder="+375..."
                 className="h-12 text-lg font-mono w-48"
               />
             ) : (
               <div
                 className="group/phone flex items-center gap-3 bg-zinc-100 hover:bg-zinc-200 px-4 py-2 rounded-xl cursor-pointer transition-colors"
                 onClick={handlePhoneClick}
               >
                 <Phone className="w-5 h-5 text-zinc-500" />
                 <span className="text-xl font-mono font-bold tracking-tight">{formData.phone || "Нет номера"}</span>
                 {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-zinc-400 opacity-0 group-hover/phone:opacity-100 transition-opacity" />}
               </div>
             )}
             {!isEditingPhone && (
                <Button variant="ghost" size="icon" onClick={() => setIsEditingPhone(true)} className="text-zinc-400">
                  <Pencil className="w-4 h-4" />
                </Button>
             )}
             <SourceBadge source={lead.source} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-zinc-400 hover:text-red-600 hover:bg-red-50">
            {isDeleting ? <Spinner className="w-5 h-5 text-red-600" /> : <Trash2 className="w-5 h-5" />}
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-500">
              <X className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="space-y-8">

          {/* Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Статус
              </label>
              <Select value={formData.status} onValueChange={(val) => setFormData(prev => ({...prev, status: val as LeadStatus}))}>
                <SelectTrigger className={`w-full h-12 rounded-xl font-semibold text-sm ${getStatusColor(formData.status)} border-0 ring-1 ring-inset ring-zinc-200`}>
                  <SelectValue>{LEAD_STATUSES.find(s => s.value === formData.status)?.label || formData.status}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> След. шаг
              </label>
              <input
                type="datetime-local"
                disabled={isTerminal}
                className="flex h-12 w-full rounded-xl border-0 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
                value={formattedActionDate}
                onChange={handleDateChange}
              />
            </div>

            <div className="space-y-2 col-span-1">
              <label className="text-xs font-bold text-zinc-500 uppercase">Автомобиль</label>
              <Textarea
                value={formData.car}
                onChange={e => setFormData(prev => ({...prev, car: e.target.value}))}
                className="min-h-[80px] rounded-xl border-zinc-200 resize-none font-medium text-sm"
                placeholder="Укажите интересующий автомобиль..."
              />
            </div>

            <div className="space-y-2 col-span-1">
              <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                <FileText className="w-4 h-4" /> Заметки
              </label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({...prev, notes: e.target.value}))}
                className="min-h-[80px] rounded-xl border-zinc-200 resize-none font-medium text-sm bg-amber-50/30"
                placeholder="Свободные заметки..."
              />
            </div>
          </div>

          {/* History Timeline */}
          {lead.history && lead.history.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2 border-b border-zinc-100 pb-2">
                <Clock className="w-4 h-4 text-zinc-400" /> История
              </h3>
              <div className="relative border-l-2 border-zinc-100 ml-3 space-y-6">
                {lead.history.map((event, i) => (
                  <div key={i} className="relative pl-6">
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(event.status).split(' ')[0]}`} />
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900">{getStatusLabel(event.status)}</span>
                        <span className="text-xs text-zinc-400">{safeFormatDate(event.changedAt)}</span>
                      </div>
                      <span className="text-xs text-zinc-500">{event.changedBy}</span>
                      {event.comment && (
                        <p className="text-sm text-zinc-700 bg-zinc-50 p-3 rounded-lg mt-2 border border-zinc-100">
                          {event.comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payload */}
          {lead.payload && Object.keys(lead.payload).filter(k => !["name", "phone", "car", "source", "notes"].includes(k)).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2 border-b border-zinc-100 pb-2">
                <Smartphone className="w-4 h-4 text-zinc-400" /> Мета-данные
              </h3>
              <pre className="text-xs font-mono text-zinc-600 bg-zinc-50 p-4 rounded-xl border border-zinc-100 overflow-x-auto">
                {JSON.stringify(Object.fromEntries(
                  Object.entries(lead.payload).filter(([k]) => !["name", "phone", "car", "source", "notes"].includes(k))
                ), null, 2)}
              </pre>
            </div>
          )}

        </div>
      </div>

      {/* Footer / Save Bar */}
      {hasChanges && (
        <div className="flex-none p-4 bg-white border-t border-zinc-100 flex justify-between items-center animate-in slide-in-from-bottom-2">
          <span className="text-sm text-zinc-500 font-medium">Есть несохраненные изменения</span>
          <Button onClick={handleSave} disabled={isSaving} className="bg-zinc-900 text-white rounded-xl px-6 h-10 font-bold hover:bg-zinc-800">
            {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : null}
            Сохранить
          </Button>
        </div>
      )}

    </div>
  );
}
