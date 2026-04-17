"use client";

import { FolderOpen, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface EmptyStateProps {
  onDrop: (files: File[]) => void;
  isSubfolder?: boolean;
}

export function EmptyState({ onDrop, isSubfolder }: EmptyStateProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center py-24 px-8 w-full cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 select-none
        ${isDragActive
          ? "border-indigo-400 bg-indigo-50/60 scale-[0.99]"
          : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50"
        }`}
    >
      <input {...getInputProps()} />
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shadow-lg shadow-amber-100">
          <FolderOpen className="w-10 h-10 text-amber-500" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-md">
          <Upload className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-base font-semibold text-zinc-800 mb-1">
        {isSubfolder ? "Папка пуста" : "Хранилище пусто"}
      </p>
      <p className="text-sm text-zinc-400 text-center max-w-xs leading-relaxed">
        {isDragActive
          ? "Отпустите файлы для загрузки"
          : "Перетащите файлы сюда или нажмите для выбора"}
      </p>
    </div>
  );
}
