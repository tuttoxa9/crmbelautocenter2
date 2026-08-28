"use client";

import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { S3Object } from "./useFileManager";
import { fileLabel } from "@/lib/files/displayName";

export function RenameDialog({
  item,
  onConfirm,
  onCancel,
}: {
  item: S3Object;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}) {
  const label = fileLabel(item.name);
  const [name, setName] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);
  const slash = /[/\\]/.test(name);
  const extChanged =
    item.type === "file" &&
    name.includes(".") &&
    label.includes(".") &&
    name.slice(name.lastIndexOf(".")).toLowerCase() !== label.slice(label.lastIndexOf(".")).toLowerCase();
  const isValid = name.trim().length > 0 && name.trim() !== label && !slash;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const dotIdx = item.type === "file" ? label.lastIndexOf(".") : -1;
    if (dotIdx > 0) input.setSelectionRange(0, dotIdx);
    else input.select();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, label, onCancel]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm" onClick={onCancel} />
      <form
        className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (isValid) onConfirm(name.trim());
        }}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100">
            <Pencil className="size-5 text-zinc-700" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-zinc-900">Переименовать</h3>
            <p className="truncate text-xs text-zinc-400">{label}</p>
          </div>
        </div>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
        />
        {slash ? <p className="mt-2 text-xs text-red-500">Слэш в имени нельзя</p> : null}
        {extChanged ? (
          <p className="mt-2 text-xs text-amber-600">Расширение изменится — файл может перестать открываться</p>
        ) : null}
        <div className="mt-4 flex gap-3 pb-[env(safe-area-inset-bottom)]">
          <button type="button" onClick={onCancel} className="h-12 flex-1 rounded-2xl border border-zinc-200 text-sm font-medium text-zinc-700">
            Отмена
          </button>
          <button type="submit" disabled={!isValid} className="h-12 flex-1 rounded-2xl bg-zinc-900 text-sm font-semibold text-white disabled:opacity-40">
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}
