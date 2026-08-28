"use client";

import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FilesScroller({
  children,
  className,
  viewportClassName,
  contentClassName,
  side = "left",
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  side?: "left" | "right";
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef({ needed: false, thumbTop: 0, thumbH: 48, trackH: 0 });
  const [metrics, setMetrics] = useState(metricsRef.current);
  const [hot, setHot] = useState(false);

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const overflow = scrollHeight - clientHeight > 4;
    if (!overflow) {
      if (metricsRef.current.needed) {
        metricsRef.current = { ...metricsRef.current, needed: false };
        setMetrics(metricsRef.current);
      }
      return;
    }
    const trackH = Math.max(32, clientHeight - 12);
    const ratio = clientHeight / scrollHeight;
    const thumbH = Math.max(36, Math.round(trackH * ratio));
    const maxTop = Math.max(0, trackH - thumbH);
    const thumbTop =
      scrollHeight === clientHeight ? 0 : Math.round((scrollTop / (scrollHeight - clientHeight)) * maxTop);
    const next = { needed: true, thumbTop, thumbH, trackH };
    const prev = metricsRef.current;
    if (
      prev.needed === next.needed &&
      prev.thumbTop === next.thumbTop &&
      prev.thumbH === next.thumbH &&
      prev.trackH === next.trackH
    ) {
      return;
    }
    metricsRef.current = next;
    setMetrics(next);
  }, []);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    const inner = contentRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (inner) ro.observe(inner);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const onThumbDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = viewportRef.current;
    if (!el) return;
    const pointerId = e.pointerId;
    const startY = e.clientY;
    const startTop = el.scrollTop;
    const { thumbH, trackH } = metricsRef.current;
    setHot(true);
    const onMove = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      const travel = Math.max(1, trackH - thumbH);
      el.scrollTop = startTop + ((ev.clientY - startY) / travel) * maxScroll;
    };
    const onUp = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setHot(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onTrackDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).dataset.thumb) return;
    const el = viewportRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const { thumbH, trackH } = metricsRef.current;
    const travel = Math.max(1, trackH - thumbH);
    el.scrollTop = ((y - thumbH / 2) / travel) * (el.scrollHeight - el.clientHeight);
  };

  return (
    <div className={cn("relative min-h-0", className)}>
      <div
        ref={viewportRef}
        className={cn(
          "files-hide-bar h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain",
          viewportClassName,
        )}
      >
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </div>
      {metrics.needed ? (
        <div
          className={cn("files-sb-track", side === "left" ? "is-left" : "is-right")}
          onPointerDown={onTrackDown}
          aria-hidden
        >
          <div
            data-thumb="1"
            className={cn("files-sb-thumb", hot && "is-hot")}
            onPointerDown={onThumbDown}
            style={{
              transform: `translateY(${metrics.thumbTop}px)`,
              height: metrics.thumbH,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function FilesToast({
  text,
  kind,
}: {
  text: string;
  kind: "ok" | "error";
}) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-[220] -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-2xl",
        kind === "error" ? "bg-red-500" : "bg-zinc-900",
      )}
    >
      {text}
    </div>
  );
}
