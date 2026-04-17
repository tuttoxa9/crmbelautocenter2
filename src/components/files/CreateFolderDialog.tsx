"use client";

import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";

interface CreateFolderDialogProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function CreateFolderDialog({ onConfirm, onCancel }: CreateFolderDialogProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  const isValid = name.trim().length > 0 && !/[/\\]/.test(name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) onConfirm(name.trim());
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <FolderPlus className="w-5 h-5 text-amber-500" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">Новая папка</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя папки"
            className="w-full h-11 px-4 rounded-2xl border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all mb-4 placeholder:text-zinc-400"
          />
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-2xl h-11 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              onClick={onCancel}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!isValid}
              className="flex-1 rounded-2xl h-11 bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-40"
            >
              Создать
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
