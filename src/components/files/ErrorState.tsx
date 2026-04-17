"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 w-full">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <p className="text-base font-semibold text-zinc-800 mb-1">Ошибка загрузки</p>
      <p className="text-sm text-zinc-400 text-center mb-6 max-w-xs">{message}</p>
      <Button
        onClick={onRetry}
        variant="outline"
        className="gap-2 rounded-full border-zinc-200 hover:bg-zinc-50"
      >
        <RefreshCw className="w-4 h-4" />
        Попробовать снова
      </Button>
    </div>
  );
}
