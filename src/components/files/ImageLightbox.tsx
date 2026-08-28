"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, X } from "lucide-react";
import { format, isSameYear, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";
import { S3Object } from "./useFileManager";
import { cn } from "@/lib/utils";
import { fileLabel } from "@/lib/files/displayName";

interface ImageLightboxProps {
  images: S3Object[];
  currentIndex: number;
  onClose: () => void;
  onJump: (index: number) => void;
  onDownload: (path: string) => void;
  getPublicUrl: (path: string) => string;
  formatSize: (bytes?: number) => string;
}

function when(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isToday(d)) return "Сегодня";
  if (isYesterday(d)) return "Вчера";
  return isSameYear(d, new Date())
    ? format(d, "d MMMM", { locale: ru })
    : format(d, "d MMMM yyyy", { locale: ru });
}

export function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onJump,
  onDownload,
  getPublicUrl,
  formatSize,
}: ImageLightboxProps) {
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [chrome, setChrome] = useState(true);
  const hideTimer = useRef(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const wheelLock = useRef(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const current = images[currentIndex];
  const url = current ? getPublicUrl(current.path) : "";
  const imgLoaded = loadedPath === current?.path;
  const imgFailed = failedPath === current?.path;

  const bumpChrome = useCallback(() => {
    setChrome(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setChrome(false), 3200);
  }, []);

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= images.length) return;
      onJump(next);
      bumpChrome();
    },
    [images.length, onJump, bumpChrome],
  );

  useEffect(() => {
    bumpChrome();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(hideTimer.current);
    };
  }, [bumpChrome]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(currentIndex - 1);
      }
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(currentIndex + 1);
      }
      if (e.key === "Home") {
        e.preventDefault();
        go(0);
      }
      if (e.key === "End") {
        e.preventDefault();
        go(images.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, images.length, onClose, go]);

  useEffect(() => {
    for (const delta of [-1, 1]) {
      const neighbor = images[currentIndex + delta];
      if (!neighbor) continue;
      const preload = new Image();
      preload.src = getPublicUrl(neighbor.path);
    }
  }, [currentIndex, images, getPublicUrl]);

  useEffect(() => {
    const el = stripRef.current?.querySelector(`[data-thumb="${currentIndex}"]`);
    if (el) el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [currentIndex]);

  if (!current || typeof document === "undefined") return null;

  const copyUrl = () => {
    if (!url) return;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    bumpChrome();
    window.setTimeout(() => setCopied(false), 1600);
  };

  const date = when(current.lastModified);
  const meta = [formatSize(current.size), date].filter(Boolean).join(" · ");

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black"
      onMouseMove={bumpChrome}
      onWheel={(e) => {
        if (Math.abs(e.deltaY) < 24) return;
        const now = Date.now();
        if (now - wheelLock.current < 280) return;
        wheelLock.current = now;
        go(e.deltaY > 0 ? currentIndex + 1 : currentIndex - 1);
      }}
      onTouchStart={(e) => {
        touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchRef.current;
        touchRef.current = null;
        if (!start) return;
        const dx = start.x - e.changedTouches[0].clientX;
        const dy = start.y - e.changedTouches[0].clientY;
        if (Math.abs(dx) < 14 && Math.abs(dy) < 14) {
          setChrome((v) => {
            const next = !v;
            window.clearTimeout(hideTimer.current);
            if (next) hideTimer.current = window.setTimeout(() => setChrome(false), 3200);
            return next;
          });
          return;
        }
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
          go(dx > 0 ? currentIndex + 1 : currentIndex - 1);
        } else if (dy < -80 && Math.abs(dy) > Math.abs(dx)) {
          onClose();
        }
      }}
    >
      <header
        className={cn(
          "absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-black/80 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8 transition-opacity duration-200",
          chrome ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Закрыть"
        >
          <X className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{fileLabel(current.name)}</p>
          <p className="truncate text-[11px] text-white/50">
            {images.length > 1 ? `${currentIndex + 1} из ${images.length}` : ""}
            {images.length > 1 && meta ? " · " : ""}
            {meta}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          {url ? (
            <button
              type="button"
              onClick={copyUrl}
              className="flex size-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
              title="Копировать ссылку"
            >
              {copied ? <CheckCircle2 className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDownload(current.path)}
            className="flex size-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
            title="Скачать"
          >
            <Download className="size-4" />
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {currentIndex > 0 ? (
          <button
            type="button"
            aria-label="Предыдущее"
            className={cn(
              "absolute left-2 z-10 hidden size-12 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white md:flex",
              chrome ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            onClick={() => go(currentIndex - 1)}
          >
            <ChevronLeft className="size-7" />
          </button>
        ) : null}

        <div
          className="flex h-full w-full items-center justify-center px-2 py-16 md:px-16"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {!url || imgFailed ? (
            <p className="max-w-xs text-center text-sm text-white/50">
              Нет ссылки для просмотра — скачайте файл
            </p>
          ) : (
            <>
              {!imgLoaded ? <div className="size-16 rounded-full bg-white/8" /> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={current.path}
                src={url}
                alt={fileLabel(current.name)}
                draggable={false}
                onLoad={() => setLoadedPath(current.path)}
                onError={() => setFailedPath(current.path)}
                onClick={(e) => {
                  e.stopPropagation();
                  setChrome((v) => {
                    const next = !v;
                    window.clearTimeout(hideTimer.current);
                    if (next) hideTimer.current = window.setTimeout(() => setChrome(false), 3200);
                    return next;
                  });
                }}
                className={cn(
                  "max-h-full max-w-full object-contain select-none",
                  imgLoaded ? "opacity-100" : "absolute opacity-0",
                )}
              />
            </>
          )}
        </div>

        {currentIndex < images.length - 1 ? (
          <button
            type="button"
            aria-label="Следующее"
            className={cn(
              "absolute right-2 z-10 hidden size-12 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white md:flex",
              chrome ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            onClick={() => go(currentIndex + 1)}
          >
            <ChevronRight className="size-7" />
          </button>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 to-transparent pt-8 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-opacity duration-200",
            chrome ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div
            ref={stripRef}
            className="files-hide-bar flex items-end gap-1.5 overflow-x-auto px-4"
            onWheel={(e) => e.stopPropagation()}
          >
            {images.map((img, i) => {
              const thumb = getPublicUrl(img.path);
              const active = i === currentIndex;
              return (
                <button
                  key={img.path}
                  type="button"
                  data-thumb={i}
                  onClick={() => go(i)}
                  className={cn(
                    "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg",
                    active ? "ring-2 ring-white ring-offset-2 ring-offset-black" : "opacity-55 hover:opacity-90",
                  )}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="block h-full w-full bg-white/10" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
