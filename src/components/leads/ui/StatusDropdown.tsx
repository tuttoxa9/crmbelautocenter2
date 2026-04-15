"use client";

import { useState, useRef, useEffect } from "react";
import { LeadStatus, LEAD_STATUSES } from "@/lib/types";
import { getStatusLabel } from "@/lib/displayUtils";
import { getStatusDotColor } from "./LeadBadges";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusDropdownProps {
  value: LeadStatus;
  onChange: (status: LeadStatus) => void;
  className?: string;
}

export function StatusDropdown({ value, onChange, className }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full h-10 px-3 py-2 bg-white border border-zinc-200 rounded-md shadow-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm font-medium text-zinc-900 hover:bg-zinc-50"
      >
        <span className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", getStatusDotColor(value))} />
          {getStatusLabel(value)}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-xl border border-zinc-200 rounded-md shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 py-1">
          {LEAD_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                onChange(status);
                setIsOpen(false);
              }}
              className="flex items-center justify-between w-full px-3 py-2 text-sm text-left transition-colors hover:bg-zinc-100 text-zinc-800"
            >
              <span className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", getStatusDotColor(status))} />
                {getStatusLabel(status)}
              </span>
              {value === status && <Check className="w-4 h-4 text-zinc-900" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
