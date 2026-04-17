"use client";

import { useState, useRef, useCallback } from "react";
import {
  Folder, File as FileIcon, FileText, Video, Archive,
  Download, Copy, Eye, EyeOff, Pencil, Trash2,
  CheckSquare, Square,
} from "lucide-react";
import { S3Object } from "./useFileManager";
import { cn } from "@/lib/utils";

// ─── File type helpers ────────────────────────────────────────────────────────

export function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (/^(jpe?g|png|gif|webp|svg|avif)$/.test(ext))
    return { Icon: FileIcon, color: "text-sky-500", bg: "bg-sky-50" };
  if (ext === "pdf")
    return { Icon: FileText, color: "text-red-500", bg: "bg-red-50" };
  if (/^(mp4|mov|avi|webm|mkv)$/.test(ext))
    return { Icon: Video, color: "text-violet-500", bg: "bg-violet-50" };
  if (/^(zip|rar|7z|tar|gz)$/.test(ext))
    return { Icon: Archive, color: "text-amber-500", bg: "bg-amber-50" };
  return { Icon: FileIcon, color: "text-zinc-400", bg: "bg-zinc-50" };
}

function isImage(name: string) {
  return /\.(jpe?g|png|gif|webp|svg|avif)$/i.test(name);
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface ContextAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  danger?: boolean;
}

function ContextMenu({
  actions,
  onClose,
}: {
  actions: ContextAction[];
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div className="absolute right-0 top-8 z-[100] w-48 bg-white/95 backdrop-blur-xl border border-zinc-200/60 rounded-2xl shadow-2xl shadow-zinc-200/60 py-1.5 animate-in zoom-in-95 fade-in duration-150 origin-top-right">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); action.onClick(); onClose(); }}
            className={cn(
              "flex items-center gap-2.5 w-full px-3.5 py-2 text-sm font-medium transition-colors text-left",
              action.danger
                ? "text-red-500 hover:bg-red-50"
                : "text-zinc-700 hover:bg-zinc-100"
            )}
          >
            <action.icon className="w-4 h-4 shrink-0" />
            {action.label}
          </button>
        ))}
      </div>
    </>
  );
}

// ─── Mobile Action Sheet ──────────────────────────────────────────────────────

function MobileActionSheet({
  item,
  actions,
  onClose,
}: {
  item: S3Object;
  actions: ContextAction[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-900/30 backdrop-blur-sm animate-in fade-in duration-200" />
      <div
        className="relative w-full bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-zinc-200 mx-auto mt-3 mb-4" />
        {/* Title */}
        <div className="px-5 pb-3 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-900 truncate">{item.name}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {item.type === "folder" ? "Папка" : "Файл"}
          </p>
        </div>
        {/* Actions */}
        <div className="p-3 space-y-1">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); onClose(); }}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-sm font-medium transition-colors text-left",
                action.danger
                  ? "text-red-500 hover:bg-red-50 active:bg-red-100"
                  : "text-zinc-800 hover:bg-zinc-100 active:bg-zinc-200"
              )}
            >
              <action.icon className="w-5 h-5 shrink-0" />
              {action.label}
            </button>
          ))}
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
}

// ─── Folder Card ──────────────────────────────────────────────────────────────

interface FolderCardProps {
  item: S3Object;
  isSelected: boolean;
  isHidden: boolean;
  onSelect: () => void;
  onClick: () => void;
  onToggleVisibility: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function FolderCard({
  item, isSelected, isHidden,
  onSelect, onClick, onToggleVisibility, onRename, onDelete,
}: FolderCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout>();

  const actions: ContextAction[] = [
    { label: isHidden ? "Показывать" : "Скрыть", icon: isHidden ? Eye : EyeOff, onClick: onToggleVisibility },
    { label: "Переименовать", icon: Pencil, onClick: onRename },
    { label: "Удалить", icon: Trash2, onClick: onDelete, danger: true },
  ];

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => setShowMobileSheet(true), 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer select-none",
          "active:scale-[0.96]",
          isSelected
            ? "border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-300/50 shadow-md"
            : "border-zinc-200/70 bg-white hover:border-zinc-300 hover:bg-zinc-50/80 hover:shadow-md",
          isHidden && "opacity-50"
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        {/* Checkbox */}
        <button
          className={cn(
            "absolute top-2 left-2 z-10 transition-all",
            isSelected ? "opacity-100 scale-100" : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
          )}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          {isSelected
            ? <CheckSquare className="w-5 h-5 text-indigo-600 drop-shadow-sm" />
            : <Square className="w-5 h-5 text-zinc-400 bg-white rounded" />}
        </button>

        {/* Overflow menu (desktop) */}
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="w-7 h-7 rounded-lg bg-white/90 border border-zinc-200 shadow-sm flex items-center justify-center text-zinc-400 hover:text-zinc-700 hidden md:flex"
            onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
          >
            <span className="text-xs font-bold leading-none">···</span>
          </button>
          {showMenu && (
            <ContextMenu actions={actions} onClose={() => setShowMenu(false)} />
          )}
        </div>

        {/* Icon */}
        <div
          className="w-full aspect-square flex items-center justify-center mb-2 rounded-xl bg-amber-50 transition-colors group-hover:bg-amber-100/80"
          onClick={onClick}
        >
          <Folder className="w-12 h-12 sm:w-14 sm:h-14 text-amber-400 fill-amber-200 group-hover:text-amber-500 group-hover:fill-amber-300 transition-colors drop-shadow-sm" />
          {isHidden && (
            <EyeOff className="absolute w-4 h-4 text-zinc-500" />
          )}
        </div>

        {/* Name */}
        <span
          className="text-xs sm:text-sm font-semibold text-zinc-800 w-full text-center truncate px-1 leading-tight"
          title={item.name}
          onClick={onClick}
        >
          {item.name}
        </span>
      </div>

      {showMobileSheet && (
        <MobileActionSheet
          item={item}
          actions={actions}
          onClose={() => setShowMobileSheet(false)}
        />
      )}
    </>
  );
}

// ─── File Card ────────────────────────────────────────────────────────────────

interface FileCardProps {
  item: S3Object;
  isSelected: boolean;
  onSelect: () => void;
  onOpenLightbox: () => void;
  onDownload: () => void;
  onCopyUrl: () => void;
  onRename: () => void;
  onDelete: () => void;
  publicUrl: string;
  formatSize: (bytes?: number) => string;
}

export function FileCard({
  item, isSelected,
  onSelect, onOpenLightbox, onDownload, onCopyUrl, onRename, onDelete,
  publicUrl, formatSize,
}: FileCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const img = isImage(item.name);
  const { Icon, color, bg } = getFileIcon(item.name);

  const actions: ContextAction[] = [
    { label: "Скачать", icon: Download, onClick: onDownload },
    { label: "Копировать ссылку", icon: Copy, onClick: onCopyUrl },
    { label: "Переименовать", icon: Pencil, onClick: onRename },
    { label: "Удалить", icon: Trash2, onClick: onDelete, danger: true },
  ];

  const handleClick = () => {
    if (img) onOpenLightbox();
    else onSelect();
  };

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => setShowMobileSheet(true), 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer select-none",
          "active:scale-[0.96]",
          isSelected
            ? "border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-300/50 shadow-md"
            : "border-zinc-200/70 bg-white hover:border-zinc-300 hover:bg-zinc-50/80 hover:shadow-md"
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        {/* Checkbox */}
        <button
          className={cn(
            "absolute top-2 left-2 z-10 transition-all",
            isSelected ? "opacity-100 scale-100" : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
          )}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          {isSelected
            ? <CheckSquare className="w-5 h-5 text-indigo-600 drop-shadow-sm" />
            : <Square className="w-5 h-5 text-zinc-400 bg-white rounded" />}
        </button>

        {/* Overflow menu (desktop) */}
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="w-7 h-7 rounded-lg bg-white/90 border border-zinc-200 shadow-sm items-center justify-center text-zinc-400 hover:text-zinc-700 hidden md:flex"
            onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
          >
            <span className="text-xs font-bold leading-none">···</span>
          </button>
          {showMenu && (
            <ContextMenu actions={actions} onClose={() => setShowMenu(false)} />
          )}
        </div>

        {/* Preview */}
        <div
          className={cn(
            "w-full aspect-square flex items-center justify-center mb-2 rounded-xl overflow-hidden transition-colors",
            img ? "bg-zinc-100" : bg
          )}
          onClick={handleClick}
        >
          {img ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 bg-zinc-200 animate-pulse rounded-xl" />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicUrl}
                alt={item.name}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                className={cn(
                  "object-cover w-full h-full group-hover:scale-105 transition-transform duration-300",
                  imgLoaded ? "opacity-100" : "opacity-0"
                )}
              />
            </>
          ) : (
            <Icon className={cn("w-10 h-10 sm:w-12 sm:h-12", color)} />
          )}
        </div>

        {/* Name */}
        <span
          className="text-xs sm:text-sm font-medium text-zinc-700 w-full text-center truncate px-1 leading-tight"
          title={item.name}
        >
          {item.name}
        </span>

        {/* Size */}
        <span className="text-[10px] text-zinc-400 mt-0.5 font-medium">
          {formatSize(item.size)}
        </span>
      </div>

      {showMobileSheet && (
        <MobileActionSheet
          item={item}
          actions={actions}
          onClose={() => setShowMobileSheet(false)}
        />
      )}
    </>
  );
}
