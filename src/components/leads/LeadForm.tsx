"use client";

import { useState, useEffect } from "react";
import { Lead, LeadSource, LeadStatus, STATUS_MAP, SOURCE_MAP } from "@/types/lead";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { addLead, updateLead } from "@/lib/leads";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

interface LeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
}

export function LeadForm({ open, onOpenChange, lead }: LeadFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<LeadSource>("manual");
  const [status, setStatus] = useState<LeadStatus>("new");
  const [carInterest, setCarInterest] = useState("");
  const [notes, setNotes] = useState("");

  // Simple datetime-local input state
  const [plannedDateTime, setPlannedDateTime] = useState<string>("");

  const requiresDate = status === "callback" || status === "visit_planned";

  useEffect(() => {
    if (lead && open) {
      setName(lead.name);
      setPhone(lead.phone);
      setSource(lead.source);
      setStatus(lead.status);
      setCarInterest(lead.carInterest || "");
      setNotes(lead.notes || "");

      if (lead.plannedDate) {
        // Format to YYYY-MM-DDThh:mm for datetime-local input
        const d = lead.plannedDate.toDate();
        const tzoffset = (new Date()).getTimezoneOffset() * 60000; // offset in milliseconds
        const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
        setPlannedDateTime(localISOTime);
      } else {
        setPlannedDateTime("");
      }
    } else if (open) {
      // Reset form on open if no lead
      setName("");
      setPhone("");
      setSource("manual");
      setStatus("new");
      setCarInterest("");
      setNotes("");
      setPlannedDateTime("");
    }
  }, [lead, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Вы не авторизованы");
      return;
    }

    if (requiresDate && !plannedDateTime) {
      toast.error("Укажите дату и время для данного статуса");
      return;
    }

    setLoading(true);

    try {
      let plannedDateTimestamp: Timestamp | null = null;

      if (requiresDate && plannedDateTime) {
        plannedDateTimestamp = Timestamp.fromDate(new Date(plannedDateTime));
      }

      const leadData = {
        name,
        phone,
        source,
        status,
        carInterest,
        notes,
        plannedDate: plannedDateTimestamp,
      };

      if (lead) {
        await updateLead(lead.id, leadData);
        toast.success("Лид успешно обновлен");
      } else {
        await addLead({ ...leadData, createdBy: user.uid });
        toast.success("Лид успешно добавлен");
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Произошла ошибка при сохранении");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Редактировать лид" : "Новый лид"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Петров"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+375 29 000-00-00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Источник</Label>
              <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_MAP).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="carInterest">Интересующее авто</Label>
            <Input
              id="carInterest"
              value={carInterest}
              onChange={(e) => setCarInterest(e.target.value)}
              placeholder="BMW X5 2019"
            />
          </div>

          {requiresDate && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
              <Label htmlFor="plannedDate" className="text-blue-600 font-medium">
                Дата и время {status === "callback" ? "звонка" : "визита"} *
              </Label>
              <Input
                id="plannedDate"
                type="datetime-local"
                value={plannedDateTime}
                onChange={(e) => setPlannedDateTime(e.target.value)}
                required={requiresDate}
                className="border-blue-200 focus-visible:ring-blue-500"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Заметка</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация..."
              className="resize-none h-24"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
