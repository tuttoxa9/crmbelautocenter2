"use client";

import { cn } from "@/lib/utils";

export function hueFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function CarThumb({
  name,
  hue,
  photoUrl,
  className,
}: {
  name: string;
  hue?: number;
  photoUrl?: string;
  className?: string;
}) {
  const resolvedHue = hue ?? hueFromName(name);
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={cn("relative shrink-0 overflow-hidden rounded-lg bg-ads-surface object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-lg", className)}
      style={{
        background: `linear-gradient(165deg, oklch(0.96 0.018 ${resolvedHue}) 0%, oklch(0.86 0.05 ${resolvedHue}) 100%)`,
      }}
      aria-hidden
    >
      <span
        className="absolute -top-4 -right-3 size-11 rounded-full"
        style={{ background: `oklch(0.78 0.07 ${resolvedHue} / 0.4)` }}
      />
      <span
        className="absolute -bottom-5 -left-3 size-12 rounded-full"
        style={{ background: `oklch(0.92 0.03 ${resolvedHue} / 0.7)` }}
      />
      <span className="absolute inset-x-1.5 bottom-1 truncate text-center text-xs font-semibold tracking-tight text-ads-ink/55">
        {initials}
      </span>
    </div>
  );
}
