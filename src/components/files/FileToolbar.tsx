"use client";

import {
  Folder, FolderPlus, Upload, Eye, EyeOff,
  ChevronRight, Search, X,
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
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function FileToolbar({
  breadcrumbs, currentPrefix, showHidden,
  onToggleHidden, onNavigate, onNavigateRoot,
  onOpenCreateFolder, onUpload,
  searchQuery, onSearchChange,
}: FileToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  const closeSearch = () => {
    setSearchOpen(false);
    onSearchChange("");
  };

  return (
    <div className="flex flex-col gap-2 flex-none">
      {/* Main toolbar row */}
      <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-zinc-200/70 rounded-2xl px-3 py-2 shadow-sm">

        {/* Breadcrumbs */}
        {!searchOpen && (
          <div className="flex-1 flex items-center gap-1 text-sm font-medium overflow-x-auto scrollbar-hide min-w-0">
            <button
              onClick={onNavigateRoot}
              className={cn(
                "flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg transition-colors",
                currentPrefix === ""
                  ? "text-zinc-900 bg-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
              )}
            >
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-xs">Root</span>
            </button>

            {breadcrumbs.map((part, index) => {
              const path = breadcrumbs.slice(0, index + 1).join("/") + "/";
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={path} className="flex items-center shrink-0">
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-300 mx-0.5" />
                  <button
                    onClick={() => onNavigate(path)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-xs transition-colors max-w-[100px] truncate",
                      isLast
                        ? "text-zinc-900 font-semibold bg-zinc-100"
                        : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
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

        {/* Search bar (expanded) */}
        {searchOpen && (
          <div className="flex-1 flex items-center gap-2">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Поиск файлов..."
              className="flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
            <button onClick={closeSearch} className="text-zinc-400 hover:text-zinc-700 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {/* Search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-xl transition-colors",
              searchOpen ? "bg-indigo-50 text-indigo-600" : "text-zinc-400 hover:text-zinc-700"
            )}
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            title="Поиск"
          >
            <Search className="w-4 h-4" />
          </Button>

          {/* Show/hide hidden */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-xl transition-colors",
              showHidden ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-700"
            )}
            onClick={onToggleHidden}
            title={showHidden ? "Скрыть скрытые папки" : "Показать скрытые папки"}
          >
            {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>

          <div className="w-px h-5 bg-zinc-200 mx-0.5" />

          {/* New folder */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 gap-1.5 px-2.5 text-xs font-medium"
            onClick={onOpenCreateFolder}
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Папка</span>
          </Button>

          {/* Upload */}
          <label className="cursor-pointer">
            <div className="inline-flex items-center gap-1.5 h-8 px-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-colors">
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

      {/* Search hint */}
      {searchOpen && searchQuery && (
        <p className="text-xs text-zinc-400 px-1">
          Результаты поиска для{" "}
          <span className="font-medium text-zinc-600">«{searchQuery}»</span>
        </p>
      )}
    </div>
  );
}
