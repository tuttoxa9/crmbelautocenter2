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
    return { Icon: FileIcon, color: "text-sky-400", bg: "bg-sky-500/10" };
  if (ext === "pdf")
    return { Icon: FileText, color: "text-red-400", bg: "bg-red-500/10" };
  if (/^(mp4|mov|avi|webm|mkv)$/.test(ext))
    return { Icon: Video, color: "text-violet-400", bg: "bg-violet-500/10" };
  if (/^(zip|rar|7z|tar|gz)$/.test(ext))
    return { Icon: Archive, color: "text-amber-400", bg: "bg-amber-500/10" };
  return { Icon: FileIcon, color: "text-zinc-500", bg: "bg-white/[0.05]" };
}

function isImage(name: string) {
  return /\.(jpe?g|png|gif|webp|svg|avif)$/i.test(name);
}

// ─── Context Menu (Desktop) ───────────────────────────────────────────────────

interface ContextAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  danger?: boolean;
}

function ContextMenu({ actions, onClose }: { actions: ContextAction[]; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div className="absolute right-0 top-8 z-[100] w-48 bg-zinc-900 border border-white/[0.1] rounded-2xl shadow-2xl py-1.5 animate-in zoom-in-95 fade-in duration-150 origin-top-right">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); action.onClick(); onClose(); }}
            className={cn(
              "flex items-center gap-2.5 w-full px-3.5 py-2 text-sm font-medium transition-colors text-left",
              action.danger
                ? "text-red-400 hover:bg-red-500/10"
                : "text-zinc-300 hover:bg-white/[0.07]"
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

function MobileActionSheet({ item, actions, onClose }: { item: S3Object; actions: ContextAction[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />
      <div
        className="relative w-full bg-zinc-900 border-t border-white/[0.08] rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-4" />
        <div className="px-5 pb-3 border-b border-white/[0.06]">
          <p className="text-sm font-semibold text-white truncate">{item.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{item.type === "folder" ? "Папка" : "Файл"}</p>
        </div>
        <div className="p-3 space-y-1">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); onClose(); }}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-sm font-medium transition-colors text-left",
                action.danger
                  ? "text-red-400 hover:bg-red-500/10 active:bg-red-500/20"
                  : "text-zinc-200 hover:bg-white/[0.07] active:bg-white/[0.12]"
              )}
            >
              <action.icon className="w-5 h-5 shrink-0" />
              {action.label}
            </button>
          ))}
        </div>
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

export function FolderCard({ item, isSelected, isHidden, onSelect, onClick, onToggleVisibility, onRename, onDelete }: FolderCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const actions: ContextAction[] = [
    { label: isHidden ? "Показывать" : "Скрыть", icon: isHidden ? Eye : EyeOff, onClick: onToggleVisibility },
    { label: "Переименовать", icon: Pencil, onClick: onRename },
    { label: "Удалить", icon: Trash2, onClick: onDelete, danger: true },
  ];

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => setShowMobileSheet(true), 500);
  }, []);
  const handleTouchEnd = useCallback(() => { clearTimeout(longPressTimer.current); }, []);

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer select-none",
          "active:scale-[0.95]",
          isSelected
            ? "border-indigo-500/50 bg-indigo-500/10 ring-1 ring-indigo-500/30"
            : "border-white/[0.07] bg-white/[0.04] hover:border-white/[0.14] hover:bg-white/[0.08]",
          isHidden && "opacity-40"
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
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          {isSelected
            ? <CheckSquare className="w-5 h-5 text-indigo-400" />
            : <Square className="w-5 h-5 text-zinc-600" />}
        </button>

        {/* Desktop overflow menu */}
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/[0.1] shadow-sm items-center justify-center text-zinc-400 hover:text-white hidden md:flex text-xs font-bold leading-none"
            onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
          >
            ···
          </button>
          {showMenu && <ContextMenu actions={actions} onClose={() => setShowMenu(false)} />}
        </div>

        {/* Folder icon */}
        <div
          className="w-full aspect-square flex items-center justify-center mb-2 rounded-xl bg-amber-500/10 transition-colors group-hover:bg-amber-500/15"
          onClick={onClick}
        >
          <Folder className="w-12 h-12 sm:w-14 sm:h-14 text-amber-400 fill-amber-400/25 group-hover:fill-amber-400/40 transition-colors" />
        </div>

        <span className="text-xs sm:text-[13px] font-medium text-zinc-300 group-hover:text-white w-full text-center truncate px-1 leading-tight transition-colors" title={item.name}>
          {item.name}
        </span>
      </div>

      {showMobileSheet && (
        <MobileActionSheet item={item} actions={actions} onClose={() => setShowMobileSheet(false)} />
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

export function FileCard({ item, isSelected, onSelect, onOpenLightbox, onDownload, onCopyUrl, onRename, onDelete, publicUrl, formatSize }: FileCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const img = isImage(item.name);
  const { Icon, color, bg } = getFileIcon(item.name);

  const actions: ContextAction[] = [
    { label: "Скачать", icon: Download, onClick: onDownload },
    { label: "Копировать ссылку", icon: Copy, onClick: onCopyUrl },
    { label: "Переименовать", icon: Pencil, onClick: onRename },
    { label: "Удалить", icon: Trash2, onClick: onDelete, danger: true },
  ];

  const handleClick = () => { if (img) onOpenLightbox(); else onSelect(); };
  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => setShowMobileSheet(true), 500);
  }, []);
  const handleTouchEnd = useCallback(() => { clearTimeout(longPressTimer.current); }, []);

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer select-none",
          "active:scale-[0.95]",
          isSelected
            ? "border-indigo-500/50 bg-indigo-500/10 ring-1 ring-indigo-500/30"
            : "border-white/[0.07] bg-white/[0.04] hover:border-white/[0.14] hover:bg-white/[0.08]"
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
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          {isSelected
            ? <CheckSquare className="w-5 h-5 text-indigo-400" />
            : <Square className="w-5 h-5 text-zinc-600" />}
        </button>

        {/* Desktop overflow menu */}
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/[0.1] shadow-sm items-center justify-center text-zinc-400 hover:text-white hidden md:flex text-xs font-bold leading-none"
            onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
          >
            ···
          </button>
          {showMenu && <ContextMenu actions={actions} onClose={() => setShowMenu(false)} />}
        </div>

        {/* Preview */}
        <div
          className={cn(
            "w-full aspect-square flex items-center justify-center mb-2 rounded-xl overflow-hidden transition-colors relative",
            img ? "bg-zinc-800" : bg
          )}
          onClick={handleClick}
        >
          {img ? (
            <>
              {!imgLoaded && <div className="absolute inset-0 bg-white/[0.06] animate-pulse rounded-xl" />}
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

        <span className="text-xs sm:text-[13px] font-medium text-zinc-300 group-hover:text-white w-full text-center truncate px-1 leading-tight transition-colors" title={item.name}>
          {item.name}
        </span>
        <span className="text-[10px] text-zinc-600 mt-0.5 font-medium group-hover:text-zinc-500 transition-colors">
          {formatSize(item.size)}
        </span>
      </div>

      {showMobileSheet && (
        <MobileActionSheet item={item} actions={actions} onClose={() => setShowMobileSheet(false)} />
      )}
    </>
  );
}
