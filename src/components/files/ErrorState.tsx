"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 w-full">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <p className="text-base font-semibold text-zinc-300 mb-1">Ошибка загрузки</p>
      <p className="text-sm text-zinc-600 text-center mb-6 max-w-xs">{message}</p>
      <Button
        onClick={onRetry}
        variant="outline"
        className="gap-2 rounded-full border-white/[0.1] bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1] hover:text-white"
      >
        <RefreshCw className="w-4 h-4" />
        Попробовать снова
      </Button>
    </div>
  );
}
