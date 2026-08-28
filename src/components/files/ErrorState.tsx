"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertTriangle className="size-6 text-red-400" />
      </div>
      <p className="text-base font-medium text-files-ink">Не удалось открыть папку</p>
      <p className="mt-1 max-w-xs text-sm text-files-subtle">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-medium text-files-ink"
      >
        <RefreshCw className="size-4" />
        Повторить
      </button>
    </div>
  );
}
