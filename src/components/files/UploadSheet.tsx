"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Trash2, Upload, X, File as FileIcon } from "lucide-react";
import { StagedFile } from "./useFileManager";
import { cn } from "@/lib/utils";
import { ruCount } from "@/lib/files/displayName";

interface UploadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  stagedFiles: StagedFile[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onUploadAll: () => void;
  onAddMore: (files: File[]) => void;
  uploading: boolean;
  isAnyCompressing: boolean;
  isAnyReady: boolean;
  allSuccess: boolean;
  formatSize: (bytes?: number) => string;
  compressImages: boolean;
  onToggleCompress: (v: boolean) => void;
}

function Preview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!url) return <FileIcon className="size-5 text-zinc-400" />;
  return <img src={url} alt="" className="h-full w-full object-cover" />;
}

function StatusIcon({ status }: { status: StagedFile["status"] }) {
  if (status === "success") return <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />;
  if (status === "error") return <AlertCircle className="size-5 shrink-0 text-red-500" />;
  if (status === "uploading" || status === "compressing")
    return <Loader2 className="size-5 shrink-0 animate-spin text-zinc-700" />;
  return null;
}

const LABELS: Record<StagedFile["status"], string> = {
  pending: "Ждёт",
  compressing: "Готовим фото",
  ready: "Ждёт",
  uploading: "Загружаем",
  success: "Готово",
  error: "Не вышло",
};

export function UploadSheet({
  isOpen,
  onClose,
  stagedFiles,
  onRemove,
  onRetry,
  onUploadAll,
  onAddMore,
  uploading,
  isAnyCompressing,
  isAnyReady,
  allSuccess,
  formatSize,
  compressImages,
  onToggleCompress,
}: UploadSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !uploading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, uploading, onClose]);

  if (!isOpen) return null;
  const pendingCount = stagedFiles.filter((f) => f.status === "ready" || f.status === "error").length;
  const label = uploading
    ? "Загрузка…"
    : isAnyCompressing
      ? "Готовим фото…"
      : pendingCount > 0
        ? `Загрузить (${pendingCount})`
        : "Загрузить";

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={uploading ? undefined : onClose} />
      <div className="relative flex max-h-[80vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl md:max-h-[600px] md:max-w-md md:rounded-3xl">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-zinc-200 md:hidden" />
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 pt-4 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Загрузка</h3>
            <p className="mt-0.5 text-[11px] text-zinc-400">{ruCount(stagedFiles.length, "файл", "файла", "файлов")}</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100">
            <X className="size-4" />
          </button>
        </div>

        <label className="mx-5 mt-3 flex cursor-pointer items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <span>Уменьшить фото (~1920px)</span>
          <input
            type="checkbox"
            checked={compressImages}
            onChange={(e) => onToggleCompress(e.target.checked)}
            className="size-4 accent-zinc-900"
          />
        </label>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {stagedFiles.map((sf) => (
            <div
              key={sf.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3",
                sf.status === "success"
                  ? "border-emerald-200/60 bg-emerald-50/50"
                  : sf.status === "error"
                    ? "border-red-200/60 bg-red-50/50"
                    : "border-zinc-100 bg-zinc-50",
              )}
            >
              <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200/60 bg-white">
                <Preview file={sf.file} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-xs font-semibold text-zinc-800">{sf.file.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  {sf.compressedSize ? (
                    <span className="text-zinc-400">
                      <span className="line-through">{formatSize(sf.originalSize)}</span>
                      {" → "}
                      <span className="font-medium text-emerald-600">{formatSize(sf.compressedSize)}</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400">{formatSize(sf.originalSize)}</span>
                  )}
                  <span className={sf.status === "error" ? "text-red-500" : "text-zinc-400"}>{LABELS[sf.status]}</span>
                </div>
                {sf.error ? <p className="text-[10px] text-red-500">{sf.error}</p> : null}
                {(sf.status === "uploading" || sf.status === "success") && (
                  <div className="h-1 overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-150 ease-linear",
                        sf.status === "success" ? "bg-emerald-500" : "bg-zinc-800",
                      )}
                      style={{ width: `${sf.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <StatusIcon status={sf.status} />
                {sf.status === "error" && (
                  <button type="button" onClick={() => onRetry(sf.id)} className="flex size-8 items-center justify-center rounded-lg bg-red-50" title="Повторить">
                    <RefreshCw className="size-3.5 text-red-500" />
                  </button>
                )}
                {["ready", "pending", "error"].includes(sf.status) && (
                  <button type="button" onClick={() => onRemove(sf.id)} className="flex size-8 items-center justify-center rounded-lg hover:bg-zinc-200/60">
                    <Trash2 className="size-3.5 text-zinc-400" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-zinc-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {allSuccess ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-emerald-600">
              <CheckCircle2 className="size-5" />
              Всё загружено
            </div>
          ) : (
            <>
              <label className="flex h-10 cursor-pointer items-center justify-center rounded-xl text-xs font-medium text-zinc-500 hover:bg-zinc-50">
                + ещё файлы
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) onAddMore(Array.from(e.target.files));
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50"
                onClick={onUploadAll}
                disabled={uploading || isAnyCompressing || !isAnyReady}
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {label}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
