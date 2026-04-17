"use client";

import { Download, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectionBarProps {
  count: number;
  onDownload: () => void;
  onDelete: () => void;
  onClear: () => void;
  isDownloading?: boolean;
}

export function SelectionBar({ count, onDownload, onDelete, onClear, isDownloading }: SelectionBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-2 bg-zinc-900/95 backdrop-blur-xl text-white px-3 py-2.5 rounded-2xl shadow-2xl shadow-zinc-900/30 border border-zinc-700/50">
        {/* Count badge */}
        <div className="flex items-center gap-2 px-2 pr-3 border-r border-zinc-700/60 mr-1">
          <span className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[11px] font-bold shrink-0">
            {count}
          </span>
          <span className="text-sm font-medium text-zinc-200 hidden sm:inline whitespace-nowrap">
            {count === 1 ? "выбран" : "выбрано"}
          </span>
        </div>

        <Button
          onClick={onDownload}
          disabled={isDownloading}
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-zinc-300 hover:text-white hover:bg-zinc-700/60 rounded-xl gap-2 text-sm"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Скачать</span>
        </Button>

        <Button
          onClick={onDelete}
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl gap-2 text-sm"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Удалить</span>
        </Button>

        <Button
          onClick={onClear}
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60 rounded-xl shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
