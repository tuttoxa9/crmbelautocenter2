"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CenterNote({
  text,
  action,
}: {
  text: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[15px] text-leads-muted">{text}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-xl bg-leads-paper px-4 py-2 text-[13px] font-medium text-leads-paper-ink"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export function InlineNotice({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-xl bg-leads-raised px-4 py-3 text-[13px] text-leads-ink ring-1 ring-leads-line md:mx-5">
      <p>{text}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="shrink-0 font-medium">
          Повторить
        </button>
      ) : null}
    </div>
  );
}

export function LeadSkeleton() {
  return (
    <div className="flex min-h-[76px] animate-pulse items-center gap-3 px-4">
      <span className="size-2 rounded-full bg-white/10" />
      <span className="size-4 rounded bg-white/10" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-40 max-w-full rounded bg-white/10" />
        <div className="h-3 w-24 rounded bg-white/10" />
      </div>
      <span className="size-10 rounded-lg bg-white/10" />
      <span className="h-3 w-12 rounded bg-white/10" />
    </div>
  );
}

export function CarCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl bg-leads-card ring-1 ring-leads-line">
      <div className="aspect-[16/10] bg-leads-photo" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 rounded bg-white/10" />
        <div className="h-3 w-1/3 rounded bg-white/10" />
      </div>
    </div>
  );
}

export function CarPhoto({
  name,
  photoUrl,
  className,
}: {
  name?: string;
  photoUrl?: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const letter = (name || "?").trim().charAt(0).toUpperCase() || "?";
  if (!photoUrl || broken) {
    return (
      <span className={cn("flex items-center justify-center bg-leads-photo text-[13px] font-medium text-leads-muted", className)}>
        {letter}
      </span>
    );
  }
  return (
    <img
      src={photoUrl}
      alt=""
      className={cn("h-full w-full object-cover", className)}
      onError={() => setBroken(true)}
    />
  );
}
