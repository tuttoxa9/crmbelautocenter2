"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, X } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const current = images[currentIndex];
  const imgLoaded = loadedPath === current?.path;
  const url = current ? getPublicUrl(current.path) : "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) onJump(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < images.length - 1) onJump(currentIndex + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, images.length, onClose, onJump]);

  useEffect(() => {
    for (const delta of [-1, 1]) {
      const neighbor = images[currentIndex + delta];
      if (!neighbor) continue;
      const preload = new Image();
      preload.src = getPublicUrl(neighbor.path);
    }
  }, [currentIndex, images, getPublicUrl]);

  if (!current) return null;

  const copyUrl = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95"
      onTouchStart={(e) => setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        if (!touchStart) return;
        const dx = touchStart.x - e.changedTouches[0].clientX;
        const dy = touchStart.y - e.changedTouches[0].clientY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0 && currentIndex < images.length - 1) onJump(currentIndex + 1);
          if (dx < 0 && currentIndex > 0) onJump(currentIndex - 1);
        } else if (dy < -70 && Math.abs(dy) > Math.abs(dx)) {
          onClose();
        }
        setTouchStart(null);
      }}
    >
      <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white">
            <X className="size-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{fileLabel(current.name)}</p>
            <p className="text-xs text-white/50">{formatSize(current.size)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {url ? (
            <button type="button" onClick={copyUrl} className="flex size-11 items-center justify-center rounded-xl text-white/70 hover:bg-white/10" title="Копировать ссылку">
              {copied ? <CheckCircle2 className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
            </button>
          ) : null}
          <button type="button" onClick={() => onDownload(current.path)} className="flex size-11 items-center justify-center rounded-xl text-white/70 hover:bg-white/10" title="Скачать">
            <Download className="size-4" />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-16">
        {currentIndex > 0 && (
          <button
            type="button"
            className="absolute left-2 hidden size-12 items-center justify-center rounded-2xl text-white/60 hover:bg-white/10 md:flex"
            onClick={() => onJump(currentIndex - 1)}
          >
            <ChevronLeft className="size-7" />
          </button>
        )}
        <div className="flex max-h-full max-w-full items-center justify-center overflow-auto">
          {!imgLoaded && <div className="size-40 rounded-2xl bg-white/5" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current.path}
            src={url}
            alt={fileLabel(current.name)}
            onLoad={() => setLoadedPath(current.path)}
            className={cn(
              "max-h-[calc(100dvh-160px)] max-w-full object-contain select-none",
              imgLoaded ? "opacity-100" : "absolute opacity-0",
            )}
          />
        </div>
        {currentIndex < images.length - 1 && (
          <button
            type="button"
            className="absolute right-2 hidden size-12 items-center justify-center rounded-2xl text-white/60 hover:bg-white/10 md:flex"
            onClick={() => onJump(currentIndex + 1)}
          >
            <ChevronRight className="size-7" />
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {images.length > 1 && images.length <= 12 && (
          <div className="flex items-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onJump(i)}
                className={cn("rounded-full", i === currentIndex ? "h-1.5 w-4 bg-white" : "size-1.5 bg-white/30")}
              />
            ))}
          </div>
        )}
        <p className="text-xs font-medium text-white/40">
          {currentIndex + 1} / {images.length}
        </p>
      </div>
    </div>
  );
}
