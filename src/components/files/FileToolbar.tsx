"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Camera,
  ChevronRight,
  Eye,
  EyeOff,
  FolderPlus,
  Grid2x2,
  List,
  Plus,
  Search,
  Upload,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortMode, TypeFilter, ViewMode } from "./useFileManager";

interface FileToolbarProps {
  breadcrumbs: string[];
  currentPrefix: string;
  showHidden: boolean;
  hiddenCount: number;
  onToggleHidden: () => void;
  onNavigate: (prefix: string) => void;
  onNavigateRoot: () => void;
  onOpenCreateFolder: () => void;
  onUpload: (files: File[]) => void;
  onOpenVideoCompressor: () => void;
  onCameraCapture: (files: File[]) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: ViewMode;
  onViewMode: (v: ViewMode) => void;
  sortMode: SortMode;
  onSortMode: (v: SortMode) => void;
  typeFilter: TypeFilter;
  onTypeFilter: (v: TypeFilter) => void;
  itemCount: number;
}

export function FileToolbar(props: FileToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const plusRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (plusRef.current && !plusRef.current.contains(e.target as Node)) setPlusOpen(false);
      if (uploadRef.current && !uploadRef.current.contains(e.target as Node)) setUploadOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const closeSearch = () => {
    setSearchOpen(false);
    props.onSearchChange("");
  };

  return (
    <div className="flex flex-none flex-col gap-2 px-3 pt-3 pb-2 sm:px-4">
      <div className="flex items-center gap-2">
        <nav className="files-crumbs min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-h-11 items-center gap-0.5">
            <Crumb active={!props.currentPrefix} onClick={props.onNavigateRoot}>
              Файлы
            </Crumb>
            {props.breadcrumbs.map((part, index) => {
              const path = `${props.breadcrumbs.slice(0, index + 1).join("/")}/`;
              const isLast = index === props.breadcrumbs.length - 1;
              return (
                <div key={path} className="flex shrink-0 items-center">
                  <ChevronRight className="mx-0.5 size-3 text-files-subtle" />
                  {isLast ? (
                    <span className="max-w-[160px] truncate px-2 py-1 text-sm font-medium text-files-ink" title={part}>
                      {part}
                    </span>
                  ) : (
                    <Crumb onClick={() => props.onNavigate(path)}>{part}</Crumb>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="hidden min-w-0 items-center gap-2 md:flex">
          <label className="flex h-9 w-56 items-center gap-2 rounded-xl bg-white/5 px-3 ring-1 ring-white/8 focus-within:ring-white/20">
            <Search className="size-3.5 shrink-0 text-files-subtle" />
            <input
              value={props.searchQuery}
              onChange={(e) => props.onSearchChange(e.target.value)}
              placeholder="В этой папке"
              className="w-full bg-transparent text-sm text-files-ink outline-none placeholder:text-files-subtle"
            />
            {props.searchQuery ? (
              <button type="button" onClick={() => props.onSearchChange("")} className="text-files-subtle hover:text-files-ink">
                <X className="size-3.5" />
              </button>
            ) : null}
          </label>
        </div>

        <button
          type="button"
          className={cn(
            "flex size-11 items-center justify-center rounded-xl md:hidden",
            searchOpen ? "bg-white/10 text-files-ink" : "text-files-muted hover:bg-white/8",
          )}
          onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          aria-label="Поиск"
        >
          <Search className="size-4" />
        </button>

        <div className="relative hidden md:block" ref={uploadRef}>
          <button
            type="button"
            onClick={() => setUploadOpen((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-files-ink px-3 text-xs font-semibold text-files-bg hover:bg-white"
          >
            <Upload className="size-3.5" />
            Загрузить
          </button>
          {uploadOpen && (
            <Menu>
              <MenuItem
                onClick={() => {
                  setUploadOpen(false);
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="size-4" /> Фото и файлы
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setUploadOpen(false);
                  props.onOpenVideoCompressor();
                }}
              >
                <Video className="size-4" /> Видео с сжатием
              </MenuItem>
            </Menu>
          )}
        </div>

        <button
          type="button"
          onClick={props.onOpenCreateFolder}
          className="hidden h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-files-muted hover:bg-white/8 hover:text-files-ink md:inline-flex"
        >
          <FolderPlus className="size-3.5" />
          Папка
        </button>

        <div className="relative md:hidden" ref={plusRef}>
          <button
            type="button"
            aria-label="Действия"
            onClick={() => setPlusOpen((v) => !v)}
            className="flex size-11 items-center justify-center rounded-xl bg-files-ink text-files-bg"
          >
            <Plus className="size-5" />
          </button>
          {plusOpen && (
            <Menu align="right">
              <MenuItem onClick={() => { setPlusOpen(false); fileInputRef.current?.click(); }}>
                <Upload className="size-4" /> Загрузить фото и файлы
              </MenuItem>
              <MenuItem onClick={() => { setPlusOpen(false); cameraInputRef.current?.click(); }}>
                <Camera className="size-4" /> Камера
              </MenuItem>
              <MenuItem onClick={() => { setPlusOpen(false); props.onOpenVideoCompressor(); }}>
                <Video className="size-4" /> Видео с сжатием
              </MenuItem>
              <MenuItem onClick={() => { setPlusOpen(false); props.onOpenCreateFolder(); }}>
                <FolderPlus className="size-4" /> Новая папка
              </MenuItem>
              <MenuItem onClick={() => { setPlusOpen(false); props.onToggleHidden(); }}>
                {props.showHidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {props.showHidden ? "Скрыть служебные" : "Показать скрытые"}
              </MenuItem>
              <MenuItem onClick={() => { setPlusOpen(false); props.onViewMode(props.viewMode === "grid" ? "list" : "grid"); }}>
                {props.viewMode === "grid" ? <List className="size-4" /> : <Grid2x2 className="size-4" />}
                {props.viewMode === "grid" ? "Список" : "Сетка"}
              </MenuItem>
            </Menu>
          )}
        </div>
      </div>

      {searchOpen && (
        <label className="flex h-11 items-center gap-2 rounded-xl bg-white/5 px-3 ring-1 ring-white/8 md:hidden">
          <Search className="size-4 text-files-subtle" />
          <input
            autoFocus
            value={props.searchQuery}
            onChange={(e) => props.onSearchChange(e.target.value)}
            placeholder="В этой папке"
            className="w-full bg-transparent text-sm text-files-ink outline-none placeholder:text-files-subtle"
          />
          <button type="button" onClick={closeSearch} className="text-files-subtle">
            <X className="size-4" />
          </button>
        </label>
      )}

      <div className="files-crumbs flex items-center gap-1 overflow-x-auto md:hidden">
        <FilterChip active={props.typeFilter === "all"} onClick={() => props.onTypeFilter("all")}>
          Все
        </FilterChip>
        <FilterChip active={props.typeFilter === "image"} onClick={() => props.onTypeFilter("image")}>
          Фото
        </FilterChip>
        <FilterChip active={props.typeFilter === "video"} onClick={() => props.onTypeFilter("video")}>
          Видео
        </FilterChip>
        <FilterChip active={props.typeFilter === "doc"} onClick={() => props.onTypeFilter("doc")}>
          Документы
        </FilterChip>
        <span className="mx-1 h-4 w-px shrink-0 bg-white/10" />
        <FilterChip active={props.sortMode === "date"} onClick={() => props.onSortMode("date")}>
          Новые
        </FilterChip>
        <FilterChip active={props.sortMode === "name"} onClick={() => props.onSortMode("name")}>
          Имя
        </FilterChip>
        <FilterChip active={props.sortMode === "size"} onClick={() => props.onSortMode("size")}>
          Размер
        </FilterChip>
        <span className="ml-auto shrink-0 pl-2 text-xs tabular-nums text-files-subtle">{props.itemCount}</span>
      </div>

      <div className="hidden items-center gap-1.5 md:flex">
        <FilterChip active={props.typeFilter === "all"} onClick={() => props.onTypeFilter("all")}>
          Все
        </FilterChip>
        <FilterChip active={props.typeFilter === "image"} onClick={() => props.onTypeFilter("image")}>
          Фото
        </FilterChip>
        <FilterChip active={props.typeFilter === "video"} onClick={() => props.onTypeFilter("video")}>
          Видео
        </FilterChip>
        <FilterChip active={props.typeFilter === "doc"} onClick={() => props.onTypeFilter("doc")}>
          Документы
        </FilterChip>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <FilterChip active={props.sortMode === "date"} onClick={() => props.onSortMode("date")}>
          Новые
        </FilterChip>
        <FilterChip active={props.sortMode === "name"} onClick={() => props.onSortMode("name")}>
          Имя
        </FilterChip>
        <FilterChip active={props.sortMode === "size"} onClick={() => props.onSortMode("size")}>
          Размер
        </FilterChip>
        <span className="ml-auto" />
        <button
          type="button"
          title={props.showHidden ? "Скрытые папки видны всем" : "Есть скрытые папки — показать"}
          onClick={props.onToggleHidden}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs",
            props.showHidden ? "bg-white/10 text-files-ink" : "text-files-subtle hover:text-files-ink",
          )}
        >
          {props.showHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          {props.hiddenCount > 0 && !props.showHidden ? props.hiddenCount : null}
        </button>
        <button
          type="button"
          onClick={() => props.onViewMode("grid")}
          className={cn("flex size-8 items-center justify-center rounded-lg", props.viewMode === "grid" ? "bg-white/10 text-files-ink" : "text-files-subtle hover:text-files-ink")}
          aria-label="Сетка"
        >
          <Grid2x2 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => props.onViewMode("list")}
          className={cn("flex size-8 items-center justify-center rounded-lg", props.viewMode === "list" ? "bg-white/10 text-files-ink" : "text-files-subtle hover:text-files-ink")}
          aria-label="Список"
        >
          <List className="size-3.5" />
        </button>
        <span className="pl-1 text-xs tabular-nums text-files-subtle">{props.itemCount}</span>
      </div>

      {props.searchQuery ? (
        <p className="px-1 text-[11px] text-files-subtle">
          Поиск в этой папке: <span className="text-files-muted">«{props.searchQuery}»</span>
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.heic,.heif"
        onChange={(e) => {
          if (e.target.files) props.onUpload(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) props.onCameraCapture(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Crumb({ children, onClick, active }: { children: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "max-w-[140px] shrink-0 truncate rounded-lg px-2 py-1 text-sm font-medium transition-colors",
        active ? "bg-white/10 text-files-ink" : "text-files-muted hover:bg-white/8 hover:text-files-ink",
      )}
      title={children}
    >
      {children}
    </button>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 shrink-0 rounded-full px-2.5 text-xs font-medium transition-colors",
        active ? "bg-white/12 text-files-ink" : "text-files-subtle hover:text-files-ink",
      )}
    >
      {children}
    </button>
  );
}

function Menu({ children, align = "right" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <div
      className={cn(
        "absolute top-[calc(100%+6px)] z-[90] w-56 rounded-2xl bg-zinc-900 py-1.5 shadow-2xl ring-1 ring-white/10",
        align === "right" ? "right-0" : "left-0",
      )}
    >
      {children}
    </div>
  );
}

function MenuItem({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/8"
    >
      {children}
    </button>
  );
}
