"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import type { BurnTone } from "@/lib/services/adsProgress";
import { cn } from "@/lib/utils";

export function Spinner({ className, large }: { className?: string; large?: boolean }) {
  return <span className={cn(large ? "ads-spin-lg ads-spin" : "ads-spin", className)} aria-hidden />;
}

export function BusyOverlay({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-ads-card/75 backdrop-blur-sm">
      <Spinner large />
    </div>
  );
}

export function PrimaryBtn({
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-ads-ink px-3.5 text-sm font-medium text-ads-paper shadow-ads-pill transition-transform duration-150 ease-out hover:bg-ads-rail focus-visible:ring-2 focus-visible:ring-ads-accent/50 focus-visible:outline-none active:scale-[0.97] disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostBtn({
  children,
  onClick,
  className,
  title,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-ads-ink transition-colors hover:bg-ads-surface focus-visible:ring-2 focus-visible:ring-ads-accent/40 focus-visible:outline-none active:scale-[0.97] disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Закрыть"
      className="flex size-8 items-center justify-center rounded-full bg-ads-surface text-ads-ink transition-colors hover:bg-ads-line"
    >
      <X className="size-4" />
    </button>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 60,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center rounded-xl bg-ads-surface p-0.5">
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-lg text-lg text-ads-ink hover:bg-ads-card"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span className="min-w-9 text-center font-mono text-sm font-semibold tabular-nums text-ads-ink">
        {value}
      </span>
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-lg text-lg text-ads-ink hover:bg-ads-card"
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}

const TONE_BAR: Record<BurnTone, string> = {
  ok: "bg-ads-ok",
  mid: "bg-ads-mid",
  warn: "bg-ads-warn",
  critical: "bg-ads-danger",
  overdue: "bg-ads-danger",
  queue: "bg-ads-line-strong",
};
const TONE_TRACK: Record<BurnTone, string> = {
  ok: "bg-ads-surface",
  mid: "bg-ads-surface",
  warn: "bg-ads-warn-soft",
  critical: "bg-ads-danger-soft",
  overdue: "bg-ads-danger-soft",
  queue: "bg-ads-surface",
};
const TONE_TEXT: Record<BurnTone, string> = {
  ok: "text-ads-muted",
  mid: "text-ads-ink",
  warn: "text-ads-warn",
  critical: "text-ads-danger",
  overdue: "text-ads-danger",
  queue: "text-ads-muted",
};

export function BurnMeter({
  label,
  sublabel,
  percent,
  tone,
}: {
  label: string;
  sublabel: string;
  percent: number;
  tone: BurnTone;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("min-w-0 truncate text-xs font-medium", TONE_TEXT[tone])}>{label}</span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-ads-subtle">{sublabel}</span>
      </div>
      <div className={cn("h-1 overflow-hidden rounded-full", TONE_TRACK[tone])}>
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            TONE_BAR[tone],
            tone === "overdue" && "ads-burn-pulse",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function Overlay({
  open,
  onClose,
  children,
  align = "center",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: "center" | "end";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex",
        align === "end" ? "justify-end" : "items-end justify-center sm:items-center sm:p-6",
      )}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Закрыть"
        className="ads-veil absolute inset-0 bg-ads-ink/20 backdrop-blur-xl"
        onClick={onClose}
      />
      <div className={cn("relative z-10", align === "end" ? "h-full w-full max-w-md" : "w-full max-w-lg")}>
        {children}
      </div>
    </div>
  );
}

type ScrollMetrics = {
  needed: boolean;
  thumbTop: number;
  thumbH: number;
  trackH: number;
};

export function AdsScroller({
  children,
  className,
  viewportClassName,
  contentClassName,
  side = "left",
  nested = false,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  side?: "left" | "right";
  nested?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<ScrollMetrics>({ needed: false, thumbTop: 0, thumbH: 48, trackH: 0 });
  const [metrics, setMetrics] = useState<ScrollMetrics>(metricsRef.current);
  const [hot, setHot] = useState(false);
  const [finePointer, setFinePointer] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFinePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const overflow = scrollHeight - clientHeight > 4;
    const trackH = Math.max(0, clientHeight - 12);
    if (!overflow || trackH < 24) {
      const next = { needed: false, thumbTop: 0, thumbH: 48, trackH };
      metricsRef.current = next;
      setMetrics((prev) => (prev.needed ? next : prev));
      return;
    }
    const ratio = clientHeight / scrollHeight;
    const thumbH = Math.max(40, Math.round(trackH * ratio));
    const maxTop = Math.max(0, trackH - thumbH);
    const thumbTop =
      maxTop === 0 ? 0 : Math.round((scrollTop / (scrollHeight - clientHeight)) * maxTop);
    const next = { needed: true, thumbTop, thumbH, trackH };
    metricsRef.current = next;
    setMetrics((prev) =>
      prev.needed === next.needed &&
      prev.thumbTop === next.thumbTop &&
      prev.thumbH === next.thumbH &&
      prev.trackH === next.trackH
        ? prev
        : next,
    );
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, children]);

  useEffect(() => {
    const el = viewportRef.current;
    const content = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    if (content) ro.observe(content);
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const onThumbDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!finePointer) return;
    e.preventDefault();
    e.stopPropagation();
    const el = viewportRef.current;
    if (!el) return;
    const pointerId = e.pointerId;
    const startY = e.clientY;
    const startTop = el.scrollTop;
    const { thumbH, trackH } = metricsRef.current;
    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    setHot(true);

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      const travel = Math.max(1, trackH - thumbH);
      el.scrollTop = startTop + ((ev.clientY - startY) / travel) * maxScroll;
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.userSelect = prevSelect;
      setHot(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const onTrackDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!finePointer) return;
    if ((e.target as HTMLElement).dataset.thumb === "1") return;
    const el = viewportRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const { thumbH, trackH } = metricsRef.current;
    const y = e.clientY - rect.top - thumbH / 2;
    const travel = Math.max(1, trackH - thumbH);
    const maxScroll = el.scrollHeight - el.clientHeight;
    el.scrollTop = (y / travel) * maxScroll;
  };

  return (
    <div className={cn("relative min-h-0", nested && "max-lg:contents", className)}>
      <div
        ref={viewportRef}
        className={cn(
          "ads-hide-bar min-h-0",
          nested
            ? "max-lg:h-auto max-lg:overflow-visible lg:h-full lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain"
            : "h-full overflow-x-hidden overflow-y-auto overscroll-contain [touch-action:pan-y]",
          viewportClassName,
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </div>
      {finePointer && metrics.needed ? (
        <div
          className={cn("ads-sb-track", side === "right" ? "is-right" : "is-left")}
          onPointerDown={onTrackDown}
          aria-hidden
        >
          <div
            data-thumb="1"
            className={cn("ads-sb-thumb", hot && "is-hot")}
            style={{
              transform: `translateY(${metrics.thumbTop}px)`,
              height: metrics.thumbH,
            }}
            onPointerDown={onThumbDown}
          />
        </div>
      ) : null}
    </div>
  );
}
