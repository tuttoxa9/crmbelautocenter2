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
  "call", "walk_in", "site", "instagram", "tiktok", "telegram", "kufar"
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
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-11 w-full items-center justify-between gap-1.5 rounded-xl bg-leads-card px-3 text-[14px] font-medium text-leads-ink ring-1 ring-leads-line transition-colors duration-200 hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2">
          <SourceIcon source={value} className="w-4 h-4 text-zinc-500" />
          {getSourceLabel(value)}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl bg-leads-raised py-1 shadow-xl ring-1 ring-leads-line">
          {SOURCES.map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => {
                onChange(source);
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-[14px] text-leads-ink transition-colors duration-200 hover:bg-white/[0.06]"
            >
              <span className="flex items-center gap-2">
                <SourceIcon source={source} className="w-4 h-4 text-zinc-500" />
                {getSourceLabel(source)}
              </span>
              {value === source && <Check className="w-4 h-4 text-zinc-100" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
