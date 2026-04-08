"use client";

import * as React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DatePickerButtonProps {
  icon: React.ReactNode;
  label: string;
  onSelect: (date: Date) => void;
  disabled?: boolean;
  className?: string;
}

export function DatePickerButton({ icon, label, onSelect, disabled, className }: DatePickerButtonProps) {
  const [date, setDate] = React.useState<Date>();
  const [time, setTime] = React.useState("12:00");
  const [open, setOpen] = React.useState(false);

  const handleConfirm = () => {
    if (date) {
      const [hours, minutes] = time.split(":").map(Number);
      const selectedDateTime = new Date(date);
      selectedDateTime.setHours(hours || 0, minutes || 0, 0, 0);
      onSelect(selectedDateTime);
      setOpen(false);
      setDate(undefined);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <button
          disabled={disabled}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl font-medium transition-colors disabled:opacity-50",
            className
          )}
        >
          {icon} {label}
        </button>
      } />
      <PopoverContent className="w-auto p-0" align="center">
        <div className="p-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            locale={ru}
            className="rounded-md border-none mb-3"
          />
          <div className="flex items-center gap-2 mb-3 px-2">
            <span className="text-sm font-medium">Время:</span>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-[120px] h-8 text-sm"
            />
          </div>
          <Button
            onClick={handleConfirm}
            disabled={!date}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Подтвердить
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
