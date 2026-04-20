"use client";

import { useEffect, useState } from "react";
import { X, Download, ChevronLeft, ChevronRight, Copy, CheckCircle2 } from "lucide-react";
import { S3Object } from "./useFileManager";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  images: S3Object[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDownload: (path: string) => void;
  getPublicUrl: (path: string) => string;
  formatSize: (bytes?: number) => string;
}

export function ImageLightbox({
  images, currentIndex, onClose, onPrev, onNext,
  onDownload, getPublicUrl, formatSize,
}: ImageLightboxProps) {
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const current = images[currentIndex];

  const imgLoaded = loadedPath === current?.path;

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) onPrev();
      if (e.key === "ArrowRight" && currentIndex < images.length - 1) onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, images.length, onClose, onPrev, onNext]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < images.length - 1) onNext();
      if (diff < 0 && currentIndex > 0) onPrev();
    }
    setTouchStartX(null);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(getPublicUrl(current.path));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex flex-col"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between p-4 pt-safe-4 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-sm font-semibold text-white truncate max-w-[200px]">{current.name}</p>
            <p className="text-xs text-white/50">{formatSize(current.size)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
            onClick={copyUrl}
            title="Копировать ссылку"
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => onDownload(current.path)}
            title="Скачать"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center relative px-14 md:px-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Prev button */}
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 md:left-4 h-12 w-12 rounded-2xl text-white/60 hover:text-white hover:bg-white/15 transition-all"
            onClick={onPrev}
          >
            <ChevronLeft className="w-7 h-7" />
          </Button>
        )}

        <div className="relative max-h-full max-w-full flex items-center justify-center">
          {/* Blur placeholder */}
          {!imgLoaded && (
            <div className="absolute inset-0 bg-white/5 rounded-2xl animate-pulse" style={{ width: 200, height: 200 }} />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current.path}
            src={getPublicUrl(current.path)}
            alt={current.name}
            onLoad={() => setLoadedPath(current.path)}
            className={cn(
              "max-h-[calc(100vh-180px)] max-w-full object-contain rounded-2xl transition-opacity duration-300 shadow-2xl",
              imgLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        </div>

        {/* Next button */}
        {currentIndex < images.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 md:right-4 h-12 w-12 rounded-2xl text-white/60 hover:text-white hover:bg-white/15 transition-all"
            onClick={onNext}
          >
            <ChevronRight className="w-7 h-7" />
          </Button>
        )}
      </div>

      {/* Bottom strip — counter + dot indicators */}
      <div
        className="flex flex-col items-center gap-3 py-4 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dot indicators (max 12 shown) */}
        {images.length > 1 && images.length <= 20 && (
          <div className="flex items-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  const diff = i - currentIndex;
                  if (diff > 0) for (let j = 0; j < diff; j++) onNext();
                  if (diff < 0) for (let j = 0; j < -diff; j++) onPrev();
                }}
                className={cn(
                  "rounded-full transition-all",
                  i === currentIndex
                    ? "w-4 h-1.5 bg-white"
                    : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
                )}
              />
            ))}
          </div>
        )}
        <p className="text-xs text-white/40 font-medium">
          {currentIndex + 1} / {images.length}
        </p>
      </div>
    </div>
  );
}
