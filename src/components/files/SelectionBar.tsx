"use client";

import { Download, Loader2, Trash2, X } from "lucide-react";
import { ruCount } from "@/lib/files/displayName";

interface SelectionBarProps {
  count: number;
  onDownload: () => void;
  onDelete: () => void;
  onClear: () => void;
  onSelectAll: () => void;
  isDownloading?: boolean;
  downloadLabel?: string;
}

export function SelectionBar({
  count,
  onDownload,
  onDelete,
  onClear,
  onSelectAll,
  isDownloading,
  downloadLabel,
}: SelectionBarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex w-full max-w-lg items-center gap-1 rounded-2xl bg-zinc-900/95 px-2 py-2 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl sm:w-auto sm:px-3">
        <div className="flex items-center gap-2 border-r border-white/10 pr-3 pl-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-files-ink text-[11px] font-bold text-files-bg">
            {count}
          </span>
          <span className="hidden text-sm text-zinc-200 sm:inline">{ruCount(count, "выбран", "выбрано", "выбрано")}</span>
        </div>
        <button
          type="button"
          onClick={onSelectAll}
          className="h-11 rounded-xl px-3 text-sm text-zinc-300 hover:bg-white/8"
        >
          Все
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading}
          className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm text-zinc-200 hover:bg-white/8 disabled:opacity-50"
        >
          {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span className="hidden sm:inline">{downloadLabel || "Скачать"}</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm text-red-400 hover:bg-red-500/15"
        >
          <Trash2 className="size-4" />
          <span className="hidden sm:inline">Удалить</span>
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="Снять выделение"
          className="flex size-11 items-center justify-center rounded-xl text-zinc-500 hover:bg-white/8 hover:text-zinc-300"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
