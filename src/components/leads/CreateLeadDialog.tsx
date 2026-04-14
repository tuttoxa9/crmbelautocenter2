"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadSource } from "@/lib/types";
import { createLead } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { Plus } from "lucide-react";

export function CreateLeadDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    source: "call" as LeadSource,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      await createLead({
        name: formData.name,
        phone: formData.phone,
        source: formData.source,
        status: "new",
        car: "",
        notes: "",
      }, user.email || 'unknown');
      setOpen(false);
      setFormData({ name: "", phone: "", source: "call" });
    } catch (error) {
      console.error("Failed to create lead:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-12 px-6 font-bold shadow-sm"><Plus className="w-5 h-5 mr-2" /> Добавить лида</Button>} />
      <DialogContent className="sm:max-w-[425px] p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black mb-4">Новый лид</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase">Имя</label>
            <Input
              value={formData.name}
              onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
              className="h-12 rounded-xl bg-zinc-50 border-zinc-200 font-medium"
              placeholder="Имя клиента"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase">Телефон</label>
            <Input
              required
              value={formData.phone}
              onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))}
              className="h-12 rounded-xl bg-zinc-50 border-zinc-200 font-mono text-lg"
              placeholder="+375"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase">Источник</label>
            <Select value={formData.source} onValueChange={(v) => setFormData(prev => ({...prev, source: v as LeadSource}))}>
              <SelectTrigger className="h-12 rounded-xl bg-zinc-50 border-zinc-200 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Звонок</SelectItem>
                <SelectItem value="walk_in">С улицы</SelectItem>
                <SelectItem value="site">Сайт</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold mt-6">
            {isSubmitting ? <Spinner className="w-5 h-5" /> : "Создать"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
