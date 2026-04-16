"use client";

import { useState } from "react";
import { formatPhone } from "@/lib/formatPhone";
import { LeadSource, LeadStatus } from "@/lib/types";
import { StatusDropdown } from "./StatusDropdown";
import { SourceDropdown } from "./SourceDropdown";
import { createLead } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, X } from "lucide-react";

interface QuickAddLeadProps {
  onSuccess?: () => void;
}

export function QuickAddLead({ onSuccess }: QuickAddLeadProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "", phone: "", source: "call" as LeadSource, car: "", status: "new" as LeadStatus, notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await createLead({
        name: formData.name, phone: formData.phone, source: formData.source, status: formData.status, car: formData.car, notes: formData.notes,
      }, user.email || 'unknown');
      setFormData({ name: "", phone: "", source: "call", car: "", status: "new", notes: "" });
      setIsOpen(false);
      if(onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 w-full h-[38px] bg-zinc-900 hover:bg-zinc-800 text-white rounded-[8px] text-[13px] font-semibold transition-all duration-300 ease-out shadow-sm hover:shadow active:scale-[0.98]"
      >
        <Plus className="w-4 h-4 stroke-[1.5]" /> Добавить лида
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/10 backdrop-blur-sm animate-in fade-in duration-300 ease-out"
        onClick={() => setIsOpen(false)} 
      />

      {/* Modal Card */}
      <div className="bg-white border border-border/40 rounded-[16px] w-full max-w-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-[2%] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-10 flex flex-col">
        <div className="flex justify-between items-center p-5 md:px-6 md:py-5 border-b border-border/40 bg-[#F9FAFB]/50 rounded-t-[16px]">
          <h3 className="font-semibold text-[16px] text-zinc-900 tracking-tight">Добавить заявку</h3>
          <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-900 bg-white border border-border/60 hover:bg-zinc-50 p-1.5 rounded-[8px] transition-colors shadow-sm">
            <X className="w-4 h-4 stroke-[1.5]"/>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 md:p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-5 md:gap-6">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Имя <span className="text-destructive">*</span></label>
              <input
                autoFocus required
                value={formData.name} onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
                className="w-full h-9 px-3 text-[14px] font-medium border border-border/60 rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-ring/20 hover:border-border bg-transparent transition-all duration-300 ease-out"
              />
            </div>
            
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Телефон <span className="text-destructive">*</span></label>
              <input
                required
                value={formData.phone} onChange={e => setFormData(prev => ({...prev, phone: formatPhone(e.target.value)}))}
                className="w-full h-9 px-3 text-[14px] font-mono font-medium border border-border/60 rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-ring/20 hover:border-border bg-transparent transition-all duration-300 ease-out"
              />
            </div>
            
            <div className="space-y-2 col-span-2">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Интересующий Автомобиль</label>
              <input
                value={formData.car} onChange={e => setFormData(prev => ({...prev, car: e.target.value}))}
                className="w-full h-9 px-3 text-[14px] font-medium border border-border/60 rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-ring/20 hover:border-border bg-transparent transition-all duration-300 ease-out"
              />
            </div>

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Источник</label>
              <SourceDropdown
                value={formData.source} 
                onChange={source => setFormData(prev => ({...prev, source}))}
              />
            </div>

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Начальный Статус</label>
              <StatusDropdown
                value={formData.status}
                onChange={status => setFormData(prev => ({...prev, status}))}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Заметка менеджера</label>
              <textarea
                value={formData.notes} onChange={e => setFormData(prev => ({...prev, notes: e.target.value}))}
                className="w-full min-h-[80px] p-3 text-[14px] font-medium border border-border/60 rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-ring/20 hover:border-border bg-zinc-50/50 focus:bg-white transition-all duration-300 ease-out resize-y custom-scrollbar"
              />
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-border/40">
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm text-[14px] font-semibold rounded-[10px] transition-all duration-300 ease-out active:scale-[0.98] disabled:opacity-50 hover:shadow-md"
            >
              {isSubmitting ? "Создание..." : "Добавить заявку"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
