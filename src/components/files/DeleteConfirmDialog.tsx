"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

export function DeleteConfirmDialog({
  title,
  description,
  smmWarning,
  onConfirm,
  onCancel,
}: {
  count: number;
  title: string;
  description: string;
  smmWarning?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-t-3xl bg-[#141416] p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-500/10">
            <AlertTriangle className="size-7 text-red-500" />
          </div>
          <h3 className="mb-1.5 text-lg font-semibold text-zinc-100">{title}</h3>
          <p className="text-sm leading-relaxed text-zinc-500">{description}</p>
          {smmWarning ? (
            <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-200">
              Здесь лежит публичная загрузка SMM. Удаление бьёт по роликам на сайте и в форме.
            </p>
          ) : null}
        </div>
        <div className="flex gap-3 pb-[env(safe-area-inset-bottom)]">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="h-12 flex-1 rounded-2xl border border-white/10 text-sm font-medium text-zinc-300"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600"
          >
            <Trash2 className="size-4" />
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
