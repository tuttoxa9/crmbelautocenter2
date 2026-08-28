"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  File as FileIcon,
  FileText,
  Folder,
  MoreHorizontal,
  Pencil,
  Trash2,
  Video,
} from "lucide-react";
import { S3Object } from "./useFileManager";
import { cn } from "@/lib/utils";
import { fileLabel, isImageName, isVideoName } from "@/lib/files/displayName";

export function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (/^(jpe?g|png|gif|webp|svg|avif|hei[cf])$/.test(ext))
    return { Icon: FileIcon, color: "text-zinc-300", bg: "bg-white/6" };
  if (ext === "pdf") return { Icon: FileText, color: "text-red-400", bg: "bg-red-500/10" };
  if (/^(mp4|mov|m4v|avi|webm|mkv)$/.test(ext))
    return { Icon: Video, color: "text-zinc-200", bg: "bg-white/6" };
  if (/^(zip|rar|7z|tar|gz)$/.test(ext))
    return { Icon: Archive, color: "text-files-folder", bg: "bg-amber-500/10" };
  return { Icon: FileIcon, color: "text-files-subtle", bg: "bg-white/5" };
}

export function FolderGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 52" className={className} aria-hidden>
      <path
        d="M4 14c0-3.3 2.7-6 6-6h12.8c1.5 0 2.9.7 3.8 1.9L30 14h24c3.3 0 6 2.7 6 6v20c0 3.3-2.7 6-6 6H10c-3.3 0-6-2.7-6-6V14z"
        fill="currentColor"
        opacity="0.22"
      />
      <path
        d="M4 22c0-3.3 2.7-6 6-6h44c3.3 0 6 2.7 6 6v18c0 3.3-2.7 6-6 6H10c-3.3 0-6-2.7-6-6V22z"
        fill="currentColor"
      />
    </svg>
  );
}

type Action = {
  label: string;
  icon: typeof Download;
  onClick: () => void;
  danger?: boolean;
};

function AnchoredMenu({
  open,
  anchor,
  actions,
  onClose,
}: {
  open: boolean;
  anchor: DOMRect | null;
  actions: Action[];
  onClose: () => void;
}) {
  if (!open || !anchor || typeof document === "undefined") return null;
  const top = Math.min(anchor.bottom + 6, window.innerHeight - 220);
  const left = Math.min(Math.max(8, anchor.right - 192), window.innerWidth - 200);
  return createPortal(
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div
        className="fixed z-[100] w-48 rounded-2xl bg-zinc-900 py-1.5 shadow-2xl ring-1 ring-white/10"
        style={{ top, left }}
      >
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              action.onClick();
              onClose();
            }}
            className={cn(
              "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium",
              action.danger ? "text-red-400 hover:bg-red-500/10" : "text-zinc-200 hover:bg-white/8",
            )}
          >
            <action.icon className="size-4 shrink-0" />
            {action.label}
          </button>
        ))}
      </div>
    </>,
    document.body,
  );
}

function MobileSheet({
  title,
  subtitle,
  actions,
  onClose,
}: {
  title: string;
  subtitle: string;
  actions: Action[];
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end md:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full rounded-t-3xl bg-zinc-900 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-white/8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 mb-4 h-1 w-10 rounded-full bg-white/20" />
        <div className="border-b border-white/6 px-5 pb-3">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
        </div>
        <div className="space-y-1 p-3">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-medium",
                action.danger ? "text-red-400 active:bg-red-500/10" : "text-zinc-200 active:bg-white/8",
              )}
            >
              <action.icon className="size-5 shrink-0" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function useLongPress(onLong: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const moved = useRef(false);
  return {
    onTouchStart: () => {
      moved.current = false;
      timer.current = setTimeout(() => {
        if (!moved.current) onLong();
      }, 420);
    },
    onTouchMove: () => {
      moved.current = true;
      clearTimeout(timer.current);
    },
    onTouchEnd: () => clearTimeout(timer.current),
  };
}

function CheckBtn({ selected, onClick, force }: { selected: boolean; onClick: () => void; force?: boolean }) {
  return (
    <button
      type="button"
      aria-label={selected ? "Снять выделение" : "Выбрать"}
      className={cn(
        "absolute top-2 left-2 z-10 flex size-7 items-center justify-center rounded-lg",
        selected || force ? "opacity-100" : "opacity-0 group-hover:opacity-100 max-md:opacity-0",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-[6px] ring-1",
          selected ? "bg-files-ink ring-files-ink text-files-bg" : "bg-black/40 ring-white/25",
        )}
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

interface FolderCardProps {
  item: S3Object;
  isSelected: boolean;
  isHidden: boolean;
  selectMode: boolean;
  onSelect: (e?: { shift?: boolean; meta?: boolean }) => void;
  onOpen: () => void;
  onToggleVisibility: () => void;
  onRename: () => void;
  onDelete: () => void;
  onEnterSelectMode: () => void;
}

export function FolderCard({
  item,
  isSelected,
  isHidden,
  selectMode,
  onSelect,
  onOpen,
  onToggleVisibility,
  onRename,
  onDelete,
  onEnterSelectMode,
}: FolderCardProps) {
  const [menu, setMenu] = useState<DOMRect | null>(null);
  const [sheet, setSheet] = useState(false);
  const lp = useLongPress(() => onEnterSelectMode());
  const label = fileLabel(item.name);
  const actions: Action[] = [
    { label: "Открыть", icon: Folder, onClick: onOpen },
    { label: isHidden ? "Показывать" : "Скрыть у всех", icon: isHidden ? Eye : EyeOff, onClick: onToggleVisibility },
    { label: "Переименовать", icon: Pencil, onClick: onRename },
    { label: "Удалить", icon: Trash2, onClick: onDelete, danger: true },
  ];

  return (
    <>
      <div
        className={cn(
          "group relative flex cursor-pointer flex-col items-center rounded-2xl border p-3 select-none",
          isSelected ? "border-white/25 bg-white/8" : "border-white/6 bg-white/[0.035] hover:border-white/12 hover:bg-white/[0.05]",
          isHidden && "opacity-50",
        )}
        onClick={(e) => {
          if (selectMode) {
            onSelect({ shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
            return;
          }
          if (window.matchMedia("(min-width: 768px)").matches) {
            onSelect({ shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
          } else {
            onOpen();
          }
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          onOpen();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu(new DOMRect(e.clientX, e.clientY, 0, 0));
        }}
        {...lp}
      >
        <CheckBtn selected={isSelected} force={selectMode} onClick={() => onSelect()} />
        <MoreBtn onDesktop={(r) => setMenu(r)} onMobile={() => setSheet(true)} />
        <div className="mb-2 flex aspect-square w-full items-center justify-center rounded-xl bg-gradient-to-b from-amber-500/16 to-amber-500/6">
          <FolderGlyph className="h-12 w-[58px] text-files-folder sm:h-14 sm:w-[68px]" />
        </div>
        <span className="w-full truncate px-1 text-center text-xs font-medium text-zinc-300" title={label}>
          {label}
        </span>
        {isHidden ? <span className="mt-0.5 text-[10px] text-files-subtle">Скрыта</span> : null}
      </div>
      <AnchoredMenu open={!!menu} anchor={menu} actions={actions} onClose={() => setMenu(null)} />
      {sheet && (
        <MobileSheet title={label} subtitle="Папка" actions={actions} onClose={() => setSheet(false)} />
      )}
    </>
  );
}

interface FileCardProps {
  item: S3Object;
  isSelected: boolean;
  selectMode: boolean;
  onSelect: (e?: { shift?: boolean; meta?: boolean }) => void;
  onOpen: () => void;
  onDownload: () => void;
  onCopyUrl: () => void;
  onRename: () => void;
  onDelete: () => void;
  onEnterSelectMode: () => void;
  publicUrl: string;
  formatSize: (bytes?: number) => string;
  canCopyUrl: boolean;
}

export function FileCard({
  item,
  isSelected,
  selectMode,
  onSelect,
  onOpen,
  onDownload,
  onCopyUrl,
  onRename,
  onDelete,
  onEnterSelectMode,
  publicUrl,
  formatSize,
  canCopyUrl,
}: FileCardProps) {
  const [menu, setMenu] = useState<DOMRect | null>(null);
  const [sheet, setSheet] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const lp = useLongPress(() => onEnterSelectMode());
  const img = isImageName(item.name);
  const { Icon, color, bg } = getFileIcon(item.name);
  const label = fileLabel(item.name);

  const actions: Action[] = [
    { label: "Открыть", icon: Eye, onClick: onOpen },
    { label: "Скачать", icon: Download, onClick: onDownload },
    ...(canCopyUrl ? [{ label: "Копировать ссылку", icon: Copy, onClick: onCopyUrl }] : []),
    { label: "Переименовать", icon: Pencil, onClick: onRename },
    { label: "Удалить", icon: Trash2, onClick: onDelete, danger: true },
  ];

  return (
    <>
      <div
        className={cn(
          "group relative flex cursor-pointer flex-col items-center rounded-2xl border p-3 select-none",
          isSelected ? "border-white/25 bg-white/8" : "border-white/6 bg-white/[0.035] hover:border-white/12 hover:bg-white/[0.05]",
        )}
        onClick={(e) => {
          if (selectMode) {
            onSelect({ shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
            return;
          }
          if (window.matchMedia("(min-width: 768px)").matches) {
            onSelect({ shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
          } else {
            onOpen();
          }
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          onOpen();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu(new DOMRect(e.clientX, e.clientY, 0, 0));
        }}
        {...lp}
      >
        <CheckBtn selected={isSelected} force={selectMode} onClick={() => onSelect()} />
        <MoreBtn onDesktop={(r) => setMenu(r)} onMobile={() => setSheet(true)} />
        <div className={cn("relative mb-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl", img ? "bg-zinc-800" : bg)}>
          {img && publicUrl && !imgFailed ? (
            <>
              {!imgLoaded && <div className="absolute inset-0 bg-white/6" />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicUrl}
                alt={label}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgFailed(true)}
                className={cn("h-full w-full object-cover", imgLoaded ? "opacity-100" : "opacity-0")}
              />
            </>
          ) : (
            <Icon className={cn("size-10 sm:size-12", color)} />
          )}
          {isVideoName(item.name) && (
            <span className="absolute right-1.5 bottom-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-white">видео</span>
          )}
        </div>
        <span className="w-full truncate px-1 text-center text-xs font-medium text-zinc-300" title={label}>
          {label}
        </span>
        <span className="mt-0.5 text-[10px] font-medium text-files-subtle">{formatSize(item.size)}</span>
      </div>
      <AnchoredMenu open={!!menu} anchor={menu} actions={actions} onClose={() => setMenu(null)} />
      {sheet && <MobileSheet title={label} subtitle="Файл" actions={actions} onClose={() => setSheet(false)} />}
    </>
  );
}

function MoreBtn({ onDesktop, onMobile }: { onDesktop: (r: DOMRect) => void; onMobile: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Действия"
      className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-lg bg-black/35 text-zinc-200 ring-1 ring-white/10 md:size-7 md:opacity-0 md:group-hover:opacity-100"
      onClick={(e) => {
        e.stopPropagation();
        if (window.matchMedia("(min-width: 768px)").matches) {
          onDesktop(ref.current?.getBoundingClientRect() ?? new DOMRect());
        } else {
          onMobile();
        }
      }}
    >
      <MoreHorizontal className="size-4" />
    </button>
  );
}

export function FileRow({
  item,
  isSelected,
  isHidden,
  selectMode,
  subtitle,
  onSelect,
  onOpen,
  onMenu,
  onEnterSelectMode,
  preview,
}: {
  item: S3Object;
  isSelected: boolean;
  isHidden?: boolean;
  selectMode: boolean;
  subtitle: string;
  onSelect: () => void;
  onOpen: () => void;
  onMenu: () => void;
  onEnterSelectMode: () => void;
  preview: ReactNode;
}) {
  const lp = useLongPress(() => onEnterSelectMode());
  const label = fileLabel(item.name);
  return (
    <div
      className={cn(
        "group flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 select-none",
        isSelected ? "bg-white/10" : "hover:bg-white/5",
        isHidden && "opacity-50",
      )}
      onClick={() => {
        if (selectMode || window.matchMedia("(min-width: 768px)").matches) onSelect();
        else onOpen();
      }}
      onDoubleClick={onOpen}
      {...lp}
    >
      <button
        type="button"
        className="flex size-7 shrink-0 items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <span className={cn("flex size-5 items-center justify-center rounded-[6px] ring-1", isSelected ? "bg-files-ink ring-files-ink text-files-bg" : "ring-white/20")}>
          {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
        </span>
      </button>
      <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-white/6">{preview}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-200">{label}</p>
        <p className="truncate text-xs text-files-subtle">{subtitle}</p>
      </div>
      <button
        type="button"
        aria-label="Действия"
        className="flex size-10 items-center justify-center rounded-lg text-files-subtle hover:text-files-ink"
        onClick={(e) => {
          e.stopPropagation();
          onMenu();
        }}
      >
        <MoreHorizontal className="size-4" />
      </button>
    </div>
  );
}
