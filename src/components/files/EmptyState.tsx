"use client";

import { FolderOpen, FolderPlus, Search, Upload } from "lucide-react";
import type { TypeFilter } from "./useFileManager";

type Kind = "folder" | "search" | "hidden" | "filter";

const FILTER_LABEL: Record<Exclude<TypeFilter, "all">, string> = {
  image: "фото",
  video: "видео",
  doc: "документов",
};

export function EmptyState({
  kind,
  query,
  typeFilter,
  onUpload,
  onCreateFolder,
  onShowHidden,
  onClearSearch,
  onResetFilter,
}: {
  kind: Kind;
  query?: string;
  typeFilter?: TypeFilter;
  onUpload?: () => void;
  onCreateFolder?: () => void;
  onShowHidden?: () => void;
  onClearSearch?: () => void;
  onResetFilter?: () => void;
}) {
  if (kind === "search") {
    return (
      <div className="flex flex-col items-center px-6 py-20 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white/5">
          <Search className="size-6 text-files-subtle" />
        </div>
        <p className="text-base font-medium text-files-ink">В этой папке нет «{query}»</p>
        <p className="mt-1 max-w-xs text-sm text-files-subtle">Поиск идёт только здесь, не по всему диску.</p>
        <button
          type="button"
          onClick={onClearSearch}
          className="mt-5 h-10 rounded-xl bg-white/10 px-4 text-sm font-medium text-files-ink"
        >
          Сбросить поиск
        </button>
      </div>
    );
  }

  if (kind === "filter") {
    const label = typeFilter && typeFilter !== "all" ? FILTER_LABEL[typeFilter] : "таких файлов";
    return (
      <div className="flex flex-col items-center px-6 py-20 text-center">
        <p className="text-base font-medium text-files-ink">Нет {label} в этой папке</p>
        <p className="mt-1 max-w-xs text-sm text-files-subtle">Снимите фильтр — или загрузите файл сюда.</p>
        <button
          type="button"
          onClick={onResetFilter}
          className="mt-5 h-10 rounded-xl bg-white/10 px-4 text-sm font-medium text-files-ink"
        >
          Показать все
        </button>
      </div>
    );
  }

  if (kind === "hidden") {
    return (
      <div className="flex flex-col items-center px-6 py-20 text-center">
        <p className="text-base font-medium text-files-ink">Скрытые папки спрятаны</p>
        <p className="mt-1 max-w-xs text-sm text-files-subtle">Они спрятаны у всех, кто открывает «Файлы».</p>
        <button
          type="button"
          onClick={onShowHidden}
          className="mt-5 h-10 rounded-xl bg-white/10 px-4 text-sm font-medium text-files-ink"
        >
          Показать скрытые
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 mt-2 flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center sm:mx-4">
      <div className="relative mb-5">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-500/10">
          <FolderOpen className="size-8 text-files-folder/80" />
        </div>
      </div>
      <p className="text-base font-medium text-files-ink">Здесь пусто</p>
      <p className="mt-1 max-w-xs text-sm text-files-subtle">Загрузите фото с телефона или создайте папку.</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onUpload}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-files-ink px-4 text-sm font-semibold text-files-bg"
        >
          <Upload className="size-4" />
          Загрузить
        </button>
        <button
          type="button"
          onClick={onCreateFolder}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/8 px-4 text-sm font-medium text-files-ink"
        >
          <FolderPlus className="size-4" />
          Папка
        </button>
      </div>
    </div>
  );
}
