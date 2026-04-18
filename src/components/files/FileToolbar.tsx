"use client";

import {
  Folder, FolderPlus, Upload, Eye, EyeOff,
  ChevronRight, Search, X, Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FileToolbarProps {
  breadcrumbs: string[];
  currentPrefix: string;
  showHidden: boolean;
  onToggleHidden: () => void;
  onNavigate: (prefix: string) => void;
  onNavigateRoot: () => void;
  onOpenCreateFolder: () => void;
  onUpload: (files: File[]) => void;
  onOpenVideoCompressor: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function FileToolbar({
  breadcrumbs, currentPrefix, showHidden,
  onToggleHidden, onNavigate, onNavigateRoot,
  onOpenCreateFolder, onUpload, onOpenVideoCompressor,
  searchQuery, onSearchChange,
}: FileToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  const closeSearch = () => { setSearchOpen(false); onSearchChange(""); };

  return (
    <div className="flex flex-col gap-2 flex-none">
      <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-2xl px-3 py-2">

        {/* Breadcrumbs */}
        {!searchOpen && (
          <div className="flex-1 flex items-center gap-0.5 overflow-x-auto scrollbar-hide min-w-0">
            <button
              onClick={onNavigateRoot}
              className={cn(
                "flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg transition-colors text-xs font-medium",
                currentPrefix === ""
                  ? "text-white bg-white/10"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              )}
            >
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              Root
            </button>

            {breadcrumbs.map((part, index) => {
              const path = breadcrumbs.slice(0, index + 1).join("/") + "/";
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={path} className="flex items-center shrink-0">
                  <ChevronRight className="w-3 h-3 text-zinc-600 mx-0.5" />
                  <button
                    onClick={() => onNavigate(path)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-xs font-medium transition-colors max-w-[100px] truncate",
                      isLast
                        ? "text-white bg-white/10"
                        : "text-zinc-400 hover:text-white hover:bg-white/10"
                    )}
                    title={part}
                  >
                    {part}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Search bar */}
        {searchOpen && (
          <div className="flex-1 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Поиск..."
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
            />
            <button onClick={closeSearch} className="text-zinc-600 hover:text-zinc-300 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 rounded-xl transition-colors",
              searchOpen ? "bg-indigo-500/20 text-indigo-400" : "text-zinc-500 hover:text-white hover:bg-white/10"
            )}
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          >
            <Search className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 rounded-xl transition-colors",
              showHidden ? "bg-white/10 text-zinc-300" : "text-zinc-500 hover:text-white hover:bg-white/10"
            )}
            onClick={onToggleHidden}
            title={showHidden ? "Скрыть скрытые" : "Показать скрытые"}
          >
            {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </Button>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 gap-1.5 px-2.5 text-xs font-medium"
            onClick={onOpenCreateFolder}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Папка</span>
          </Button>

          <button
            onClick={onOpenVideoCompressor}
            title="Сжать и загрузить видео"
            className="inline-flex items-center gap-1.5 h-7 px-3 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-colors ml-1"
          >
            <Video className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Сжать</span>
          </button>

          <label className="cursor-pointer ml-1">
            <div className="inline-flex items-center gap-1.5 h-7 px-3 bg-white text-zinc-900 hover:bg-zinc-100 text-xs font-semibold rounded-xl transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Загрузить</span>
            </div>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) onUpload(Array.from(e.target.files));
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {searchOpen && searchQuery && (
        <p className="text-[11px] text-zinc-500 px-1">
          Поиск: <span className="text-zinc-300 font-medium">«{searchQuery}»</span>
        </p>
      )}
    </div>
  );
}
