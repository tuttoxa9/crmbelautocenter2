"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Lead } from "@/lib/types";
import { getStatusColor, getStatusLabel, getSourceLabel } from "@/lib/displayUtils";
import { Badge } from "@/components/ui/badge";
import { format, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { ReactElement, useEffect } from "react";
import { updateLeadStatus, deleteLead, updateLeadDetails } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadStatus } from "@/lib/types";

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

export function LeadDrawer({ lead, trigger, onChange }: { lead: Lead; trigger: ReactElement, onChange?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const { user } = useAuth();

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить этого лида?")) return;

    try {
      setIsDeleting(true);
      await deleteLead(lead.id!);
      setOpen(false);
      if (onChange) onChange();
    } catch (error) {
      console.error("Error deleting lead:", error);
      alert("Ошибка при удалении");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: string | null) => {
    if (!user || !newStatus || newStatus === lead.status) return;

    try {
      setIsUpdatingStatus(true);
      await updateLeadStatus(lead.id!, newStatus as LeadStatus, user.email || "Unknown");
      if (onChange) onChange();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Ошибка при обновлении статуса");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const newDate = val ? new Date(val).getTime() : null;

    try {
      setIsUpdatingDate(true);
      await updateLeadDetails(lead.id!, { nextActionDate: newDate });
      if (onChange) onChange();
    } catch (error) {
      console.error("Error updating date:", error);
      alert("Ошибка при обновлении даты");
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const formattedActionDate = lead.nextActionDate
    ? format(new Date(lead.nextActionDate), "yyyy-MM-dd'T'HH:mm")
    : "";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl flex justify-between items-center pr-8">
            <span>{lead.name}</span>
          </SheetTitle>
          <SheetDescription>
            Заявка от {safeFormatDate(lead.createdAt)}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Main Info */}
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4 border-b pb-4 items-center">
              <div className="col-span-1 text-sm text-zinc-500">Статус</div>
              <div className="col-span-2">
                <Select disabled={isUpdatingStatus} value={lead.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className={`w-full ${getStatusColor(lead.status)} text-white border-transparent`}>
                    <SelectValue placeholder="Статус">
                      {getStatusLabel(lead.status)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Новый</SelectItem>
                    <SelectItem value="in_progress">В работе</SelectItem>
                    <SelectItem value="visit">Приезд</SelectItem>
                    <SelectItem value="visited_or_refused">Приехал/отказ</SelectItem>
                    <SelectItem value="refusal">Отказ</SelectItem>
                    <SelectItem value="bank_refusal">Отказ банка</SelectItem>
                    <SelectItem value="success">Оформился/купил</SelectItem>
                    <SelectItem value="no_answer">Недозвон</SelectItem>
                    <SelectItem value="spam">Брак/Тест</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-b pb-4">
              <div className="col-span-1 text-sm text-zinc-500">Телефон</div>
              <div className="col-span-2 font-medium">
                {lead.phone}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-b pb-4">
              <div className="col-span-1 text-sm text-zinc-500">Авто</div>
              <div className="col-span-2">
                {lead.car || "—"}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-b pb-4">
              <div className="col-span-1 text-sm text-zinc-500">Источник</div>
              <div className="col-span-2">
                {getSourceLabel(lead.source)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-b pb-4 items-center">
              <div className="col-span-1 text-sm text-zinc-500">След. действие</div>
              <div className="col-span-2">
                <input
                  type="datetime-local"
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formattedActionDate}
                  onChange={handleDateChange}
                  disabled={isUpdatingDate}
                />
              </div>
            </div>

            {lead.notes && (
              <div className="grid gap-2 border-b pb-4">
                <div className="text-sm text-zinc-500">Заметки</div>
                <div className="text-sm bg-zinc-50 p-3 rounded-md">
                  {lead.notes}
                </div>
              </div>
            )}
          </div>

          {/* Flexible Payload Viewer */}
          {lead.payload && Object.keys(lead.payload).length > 0 && (
            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-medium text-zinc-900 border-b pb-2">Дополнительные данные (Webhook/Zapier)</h3>
              <div className="bg-zinc-900 rounded-md p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-100 whitespace-pre-wrap font-mono">
                  {JSON.stringify(lead.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}


          {/* Action buttons */}
          <div className="pt-6 flex gap-3 border-t">
            <Button disabled variant="outline" className="w-full">Изменить детали</Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Удаление..." : "Удалить"}
            </Button>
          </div>

          {/* History */}
          {lead.history && lead.history.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-zinc-900 mb-3">История</h3>
              <div className="space-y-3">
                {lead.history.slice().reverse().map((entry, i) => (
                  <div key={i} className="text-xs border-l-2 border-zinc-200 pl-3 py-1">
                    <div className="flex justify-between text-zinc-500 mb-1">
                      <span>{safeFormatDate(entry.changedAt)}</span>
                      <span>{entry.changedBy}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-700">Статус: {getStatusLabel(entry.status)}</span>
                      {entry.comment && <span className="text-zinc-500">- {entry.comment}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
