"use client";

import { useState } from "react";
import { LeadSource } from "@/lib/types";
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
    name: "", phone: "", source: "call" as LeadSource
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await createLead({
        name: formData.name, phone: formData.phone, source: formData.source, status: "new", car: "", notes: "",
      }, user.email || 'unknown');
      setFormData({ name: "", phone: "", source: "call" });
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
    <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-xl animate-in fade-in slide-in-from-top-2 absolute top-0 left-0 w-full z-30">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm text-zinc-900">Новая заявка</h3>
        <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4"/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          autoFocus required
          placeholder="Имя"
          value={formData.name} onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
          className="w-full h-9 px-3 text-sm border border-zinc-200 rounded outline-none focus:border-blue-500 bg-zinc-50 focus:bg-white"
        />
        <input
          required placeholder="+375..."
          value={formData.phone} onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))}
          className="w-full h-9 px-3 text-sm font-mono border border-zinc-200 rounded outline-none focus:border-blue-500 bg-zinc-50 focus:bg-white"
        />
        <select
          value={formData.source} onChange={e => setFormData(prev => ({...prev, source: e.target.value as LeadSource}))}
          className="w-full h-9 px-3 text-sm border border-zinc-200 rounded outline-none focus:border-blue-500 bg-zinc-50 focus:bg-white"
        >
          <option value="call">Звонок</option>
          <option value="walk_in">С улицы</option>
          <option value="site">Сайт</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="telegram">Telegram</option>
        </select>
        <div className="pt-2">
          <button type="submit" disabled={isSubmitting} className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded">
            {isSubmitting ? "Создание..." : "Создать"}
          </button>
        </div>
      </form>
    </div>
  );
}
