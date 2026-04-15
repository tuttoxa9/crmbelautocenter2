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
        className="flex items-center justify-center gap-2 w-full h-10 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-sm font-semibold transition-all shadow-sm"
      >
        <Plus className="w-4 h-4" /> Добавить лида
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={() => setIsOpen(false)} 
      />

      {/* Modal Card */}
      <div className="bg-white border border-zinc-200/50 rounded-2xl w-full max-w-lg shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200 relative z-10 flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-zinc-100">
          <h3 className="font-extrabold text-lg text-zinc-900 tracking-tight">Добавить заявку</h3>
          <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 p-1.5 rounded-full transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Имя <span className="text-red-500">*</span></label>
              <input
                autoFocus required
                value={formData.name} onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
                className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-md outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-zinc-50 focus:bg-white transition-all shadow-sm"
              />
            </div>
            
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Телефон <span className="text-red-500">*</span></label>
              <input
                required
                value={formData.phone} onChange={e => setFormData(prev => ({...prev, phone: formatPhone(e.target.value)}))}
                className="w-full h-10 px-3 text-sm font-mono border border-zinc-200 rounded-md outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-zinc-50 focus:bg-white transition-all shadow-sm"
              />
            </div>
            
            <div className="space-y-1.5 col-span-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Интересующий Автомобиль</label>
              <input
                value={formData.car} onChange={e => setFormData(prev => ({...prev, car: e.target.value}))}
                className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-md outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-zinc-50 focus:bg-white transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Источник</label>
              <SourceDropdown
                value={formData.source} 
                onChange={source => setFormData(prev => ({...prev, source}))}
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Начальный Статус</label>
              <StatusDropdown
                value={formData.status}
                onChange={status => setFormData(prev => ({...prev, status}))}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Заметка менеджера</label>
              <textarea
                value={formData.notes} onChange={e => setFormData(prev => ({...prev, notes: e.target.value}))}
                className="w-full min-h-[80px] p-3 text-sm border border-zinc-200 rounded-md outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-amber-50/30 focus:bg-amber-50/60 transition-all shadow-inner resize-y custom-scrollbar"
              />
            </div>
          </div>

          <div className="pt-2 mt-4 border-t border-zinc-100">
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg shadow-zinc-900/20 text-sm font-bold rounded-xl transition-all"
            >
              {isSubmitting ? "Создание..." : "Добавить заявку"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
