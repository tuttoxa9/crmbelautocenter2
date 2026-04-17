"use client";

import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

interface DeleteConfirmDialogProps {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({ count, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onConfirm, onCancel]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 fade-in duration-200">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-1.5">Удалить элементы?</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Будет удалено{" "}
            <span className="font-semibold text-zinc-800">
              {count} {count === 1 ? "элемент" : count < 5 ? "элемента" : "элементов"}
            </span>
            . Это действие нельзя отменить.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-2xl h-11 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            onClick={onCancel}
          >
            Отмена
          </Button>
          <Button
            ref={confirmRef}
            className="flex-1 rounded-2xl h-11 bg-red-500 hover:bg-red-600 text-white gap-2 transition-all"
            onClick={onConfirm}
          >
            <Trash2 className="w-4 h-4" />
            Удалить
          </Button>
        </div>
      </div>
    </div>
  );
}
