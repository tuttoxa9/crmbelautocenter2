"use client";

import { FolderPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function CreateFolderDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const slash = /[/\\]/.test(name);
  const isValid = name.trim().length > 0 && !slash;

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm" onClick={onCancel} />
      <form
        className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (isValid) onConfirm(name.trim());
        }}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50">
            <FolderPlus className="size-5 text-amber-500" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900">Новая папка</h3>
        </div>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя папки"
          className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
        />
        {slash ? <p className="mt-2 text-xs text-red-500">Слэш в имени нельзя</p> : null}
        <div className="mt-4 flex gap-3 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 flex-1 rounded-2xl border border-zinc-200 text-sm font-medium text-zinc-700"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className="h-12 flex-1 rounded-2xl bg-zinc-900 text-sm font-semibold text-white disabled:opacity-40"
          >
            Создать
          </button>
        </div>
      </form>
    </div>
  );
}
