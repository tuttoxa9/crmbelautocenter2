"use client";

import { useState } from "react";
import { formatPhone } from "@/lib/formatPhone";
import { LeadSource, LeadStatus } from "@/lib/types";
import { CommissionStatusDropdown } from "./CommissionStatusDropdown";
import { createCommission } from "@/lib/services/commission";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, X, Clock } from "lucide-react";
import { format, isValid } from "date-fns";

interface QuickAddCommissionProps {
  onSuccess?: () => void;
}

export function QuickAddCommission({ onSuccess }: QuickAddCommissionProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "", phone: "", source: "call" as LeadSource, car: "", status: "visit" as LeadStatus, notes: "", nextActionDate: null as number | null
  });

  const terminalStatuses = ["success", "refusal", "bank_refusal", "spam"];
  const requiresNextAction = !terminalStatuses.includes(formData.status);
  const isNextActionMissing = requiresNextAction && !formData.nextActionDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isNextActionMissing) return;
    setIsSubmitting(true);
    try {
      await createCommission({
        name: formData.name, phone: formData.phone, source: formData.source, status: formData.status, car: formData.car, notes: formData.notes, nextActionDate: formData.nextActionDate
      }, user.email || 'unknown');
      setFormData({ name: "", phone: "", source: "call", car: "", status: "visit", notes: "", nextActionDate: null });
      setIsOpen(false);
      if(onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionDateObj = formData.nextActionDate ? new Date(formData.nextActionDate) : null;
  const isDateValid = actionDateObj && isValid(actionDateObj);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full text-sm font-semibold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
      >
        <Plus className="w-4 h-4" /> Добавить запись
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={() => setIsOpen(false)} 
      />

      <div className="bg-white/95 backdrop-blur-xl border border-zinc-200/50 rounded-[2rem] w-full max-w-xl shadow-[0_0_60px_-15px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-300 relative z-10 flex flex-col">
        <div className="flex justify-between items-center px-6 py-5 border-b border-zinc-100/50 bg-white/40 rounded-t-[2rem]">
          <h3 className="font-extrabold text-xl text-zinc-900 tracking-tight">Добавить запись</h3>
          <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-900 bg-zinc-100/50 hover:bg-zinc-200/50 p-2 rounded-full transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Имя <span className="text-red-500">*</span></label>
              <input
                autoFocus required
                value={formData.name} onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
                className="w-full h-11 px-4 text-sm border border-zinc-200/80 rounded-2xl outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 bg-zinc-50/50 focus:bg-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
              />
            </div>
            
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Телефон <span className="text-red-500">*</span></label>
              <input
                required
                value={formData.phone} onChange={e => setFormData(prev => ({...prev, phone: formatPhone(e.target.value)}))}
                className="w-full h-11 px-4 text-sm font-mono border border-zinc-200/80 rounded-2xl outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 bg-zinc-50/50 focus:bg-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
              />
            </div>
            
            <div className="space-y-1.5 col-span-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ссылка на объявление</label>
              <input
                value={formData.car} onChange={e => setFormData(prev => ({...prev, car: e.target.value}))}
                className="w-full h-11 px-4 text-sm border border-zinc-200/80 rounded-2xl outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 bg-zinc-50/50 focus:bg-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">Начальный Статус</label>
              <CommissionStatusDropdown
                value={formData.status}
                onChange={status => setFormData(prev => ({...prev, status}))}
              />
            </div>
            
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> След. шаг
                {requiresNextAction && <span className="text-red-500">*</span>}
              </label>
              <input
                type="datetime-local"
                className="w-full h-11 px-4 text-sm border border-zinc-200/80 rounded-2xl outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 bg-zinc-50/50 focus:bg-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                value={isDateValid ? format(actionDateObj, "yyyy-MM-dd'T'HH:mm") : ""}
                onChange={e => {
                  const val = e.target.value;
                  if (!val) { setFormData(prev => ({ ...prev, nextActionDate: null })); return; }
                  const newDate = new Date(val);
                  if (isValid(newDate)) setFormData(prev => ({ ...prev, nextActionDate: newDate.getTime() }));
                }}
              />
            </div>



            <div className="space-y-1.5 col-span-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Заметка менеджера</label>
              <textarea
                value={formData.notes} onChange={e => setFormData(prev => ({...prev, notes: e.target.value}))}
                className="w-full min-h-[90px] p-4 text-sm border border-orange-200/50 rounded-3xl outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-300 bg-orange-50/30 focus:bg-orange-50/60 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] resize-y custom-scrollbar"
              />
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-zinc-100/50 flex flex-col gap-2">
            {isNextActionMissing && (
              <p className="text-[10px] text-red-500 text-center font-medium animate-in slide-in-from-bottom-1">Обязательно выберите дату (След. шаг)</p>
            )}
            <button 
              type="submit" 
              disabled={isSubmitting || isNextActionMissing} 
              className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] text-sm font-semibold rounded-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? "Создание..." : "Добавить запись"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
