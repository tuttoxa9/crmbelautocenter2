"use client";

import { Upload, Trash2, RefreshCw, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StagedFile } from "./useFileManager";
import { cn } from "@/lib/utils";
import { File as FileIcon } from "lucide-react";

interface UploadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  stagedFiles: StagedFile[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onUploadAll: () => void;
  uploading: boolean;
  isAnyCompressing: boolean;
  isAnyReady: boolean;
  allSuccess: boolean;
  formatSize: (bytes?: number) => string;
}

function StatusIcon({ status }: { status: StagedFile["status"] }) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
    case "error":
      return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
    case "uploading":
    case "compressing":
      return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin shrink-0" />;
    default:
      return null;
  }
}

function StatusLabel({ status }: { status: StagedFile["status"] }) {
  const labels = {
    pending: "",
    compressing: "Сжимаем...",
    ready: "Готово к загрузке",
    uploading: "Загружаем...",
    success: "Загружен",
    error: "Ошибка",
  };
  const colors = {
    pending: "text-zinc-400",
    compressing: "text-indigo-500",
    ready: "text-zinc-400",
    uploading: "text-indigo-500",
    success: "text-emerald-500",
    error: "text-red-500",
  };
  return (
    <span className={cn("text-[10px] font-medium", colors[status])}>
      {labels[status]}
    </span>
  );
}

export function UploadSheet({
  isOpen, onClose, stagedFiles, onRemove, onRetry,
  onUploadAll, uploading, isAnyCompressing, isAnyReady, allSuccess, formatSize,
}: UploadSheetProps) {
  if (!isOpen) return null;

  const uploadBtnLabel = uploading
    ? "Загрузка..."
    : isAnyCompressing
    ? "Идёт сжатие..."
    : `Загрузить${stagedFiles.filter(f => f.status === "ready" || f.status === "error").length > 0 ? ` (${stagedFiles.filter(f => f.status === "ready" || f.status === "error").length})` : ""}`;

  return (
    <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-900/30 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300 flex flex-col max-h-[80vh] md:max-h-[600px]">
        {/* Handle (mobile) */}
        <div className="w-10 h-1 rounded-full bg-zinc-200 mx-auto mt-3 md:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Upload className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Загрузка файлов</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                {stagedFiles.length} {stagedFiles.length === 1 ? "файл" : "файла"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-zinc-400 hover:text-zinc-700"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {stagedFiles.map((sf) => (
            <div
              key={sf.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border transition-colors",
                sf.status === "success"
                  ? "bg-emerald-50/50 border-emerald-200/60"
                  : sf.status === "error"
                  ? "bg-red-50/50 border-red-200/60"
                  : "bg-zinc-50/80 border-zinc-100"
              )}
            >
              {/* Preview / Icon */}
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-white border border-zinc-200/60 flex items-center justify-center shrink-0">
                {sf.file.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={URL.createObjectURL(sf.file)}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileIcon className="w-5 h-5 text-zinc-400" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs font-semibold text-zinc-800 truncate">{sf.file.name}</p>
                <div className="flex items-center gap-1.5">
                  {sf.status !== "compressing" && sf.compressedSize ? (
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <span className="line-through">{formatSize(sf.originalSize)}</span>
                      <span>→</span>
                      <span className="text-emerald-600 font-medium">{formatSize(sf.compressedSize)}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400">{formatSize(sf.originalSize)}</span>
                  )}
                  <StatusLabel status={sf.status} />
                </div>

                {/* Progress bar */}
                {(sf.status === "uploading" || sf.status === "success") && (
                  <div className="h-1 bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        sf.status === "success" ? "bg-emerald-500" : "bg-indigo-500"
                      )}
                      style={{ width: `${sf.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Status / Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <StatusIcon status={sf.status} />
                {sf.status === "error" && (
                  <button
                    onClick={() => onRetry(sf.id)}
                    className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                    title="Повторить"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-red-500" />
                  </button>
                )}
                {["ready", "pending", "error"].includes(sf.status) && (
                  <button
                    onClick={() => onRemove(sf.id)}
                    className="w-7 h-7 rounded-lg hover:bg-zinc-200/60 flex items-center justify-center transition-colors"
                    title="Убрать"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 pt-3 border-t border-zinc-100">
          {allSuccess ? (
            <div className="flex items-center justify-center gap-2 text-emerald-600 py-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-semibold">Всё загружено!</span>
            </div>
          ) : (
            <Button
              className="w-full h-11 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm gap-2 disabled:opacity-50 transition-all"
              onClick={onUploadAll}
              disabled={uploading || isAnyCompressing || !isAnyReady}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploadBtnLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
