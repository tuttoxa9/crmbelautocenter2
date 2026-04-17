"use client";

import { FolderOpen, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface EmptyStateProps {
  onDrop: (files: File[]) => void;
  isSubfolder?: boolean;
}

export function EmptyState({ onDrop, isSubfolder }: EmptyStateProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: false });

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center py-24 px-8 w-full cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 select-none mt-2
        ${isDragActive
          ? "border-indigo-500/60 bg-indigo-500/10 scale-[0.99]"
          : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03]"
        }`}
    >
      <input {...getInputProps()} />
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <FolderOpen className="w-10 h-10 text-amber-400/60" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-indigo-500/80 flex items-center justify-center shadow-lg">
          <Upload className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-base font-semibold text-zinc-300 mb-1.5">
        {isSubfolder ? "Папка пуста" : "Хранилище пусто"}
      </p>
      <p className="text-sm text-zinc-600 text-center max-w-xs leading-relaxed">
        {isDragActive
          ? "Отпустите файлы для загрузки"
          : "Перетащите файлы или нажмите для выбора"}
      </p>
    </div>
  );
}
