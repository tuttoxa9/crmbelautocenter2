"use client";

import { useState, useRef, useEffect } from "react";
import { LeadSource } from "@/lib/types";
import { getSourceLabel } from "@/lib/displayUtils";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceIcon } from "./LeadBadges";

interface SourceDropdownProps {
  value: LeadSource;
  onChange: (source: LeadSource) => void;
  className?: string;
}

const SOURCES: LeadSource[] = [
  "call", "walk_in", "site", "instagram", "tiktok", "telegram"
];

export function SourceDropdown({ value, onChange, className }: SourceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        className="flex items-center justify-between w-full h-9 px-3 py-1 bg-transparent border border-border/60 rounded-[8px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/20 transition-all duration-300 ease-out text-[14px] font-medium text-zinc-900 hover:border-border"
      >
        <span className="flex items-center gap-2">
          <SourceIcon source={value} className="w-4 h-4 text-zinc-500 stroke-[1.5]" />
          {getSourceLabel(value)}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-300 ease-out stroke-[1.5]", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white/95 backdrop-blur-xl border border-border/40 rounded-[12px] shadow-lg max-h-60 overflow-y-auto animate-in fade-in zoom-in-[0.98] duration-300 ease-out py-1.5 custom-scrollbar">
          {SOURCES.map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => {
                onChange(source);
                setIsOpen(false);
              }}
              className="flex items-center justify-between w-full px-3 py-2.5 text-[14px] text-left transition-all duration-300 ease-out hover:bg-zinc-50/80 text-zinc-700 hover:text-zinc-900"
            >
              <span className="flex items-center gap-2">
                <SourceIcon source={source} className="w-4 h-4 text-zinc-500 stroke-[1.5]" />
                {getSourceLabel(source)}
              </span>
              {value === source && <Check className="w-4 h-4 text-zinc-900 stroke-[1.5] animate-in zoom-in-50 duration-300 ease-out" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
