"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FilesScroller({
  children,
  className,
  viewportClassName,
  contentClassName,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  side?: "left" | "right";
}) {
  return (
    <div className={cn("relative min-h-0", className)}>
      <div
        className={cn(
          "files-hide-bar h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain",
          viewportClassName,
        )}
      >
        <div className={contentClassName}>{children}</div>
      </div>
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
