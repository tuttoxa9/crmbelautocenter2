"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertCircle, CheckCircle2, Loader2, Pause, Play, Upload, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVideoCompressor } from "./useVideoCompressor";
import { formatBytes } from "@/lib/files/displayName";

const PRESETS = [
  { id: "light", label: "Лёгкий", hint: "для пересылки", quality: 28 },
  { id: "normal", label: "Обычный", hint: "сайт и TikTok", quality: 52 },
  { id: "max", label: "Максимум", hint: "почти как было", quality: 82 },
] as const;

interface VideoCompressorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrefix: string;
  onUploadSuccess: () => void;
}

function releaseVideoEl(el: HTMLVideoElement | null) {
  if (!el) return;
  try {
    el.pause();
    el.removeAttribute("src");
    el.srcObject = null;
    el.load();
  } catch {
    /* ignore */
  }
}

export function VideoCompressorSheet({ isOpen, onClose, currentPrefix, onUploadSuccess }: VideoCompressorSheetProps) {
  const {
    status,
    compressionProgress,
    uploadProgress,
    originalSize,
    compressedSize,
    error,
    canUploadRaw,
    compressAndUpload,
    uploadRaw,
    reset,
    abort,
  } = useVideoCompressor();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("normal");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [prevOpen, setPrevOpen] = useState(isOpen);

  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (!isOpen) {
      releaseVideoEl(videoRef.current);
      setSelectedFile(null);
      setPreset("normal");
      setPoster(null);
      reset();
    }
  }

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(selectedFile);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [selectedFile]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
        setPoster(null);
        setIsPlaying(false);
        reset();
      }
    },
    [reset],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [] },
    maxFiles: 1,
    disabled: status === "compressing" || status === "uploading",
  });

  const quality = PRESETS.find((p) => p.id === preset)?.quality ?? 52;
  const busy = status === "compressing" || status === "uploading";

  const snapPoster = () => {
    const v = videoRef.current;
    if (!v || v.videoWidth < 2) return;
    try {
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d")?.drawImage(v, 0, 0);
      setPoster(c.toDataURL("image/jpeg", 0.55));
    } catch {
      /* canvas may be tainted */
    }
  };

  const handleCompress = () => {
    if (!selectedFile) return;
    snapPoster();
    setIsPlaying(false);
    releaseVideoEl(videoRef.current);
    window.setTimeout(() => {
      void compressAndUpload(selectedFile, quality, currentPrefix);
    }, 140);
  };

  const handleUploadRaw = () => {
    if (!selectedFile) return;
    snapPoster();
    setIsPlaying(false);
    releaseVideoEl(videoRef.current);
    window.setTimeout(() => {
      void uploadRaw(selectedFile, currentPrefix);
    }, 80);
  };

  useEffect(() => {
    if (status !== "error" && status !== "idle") return;
    const v = videoRef.current;
    if (!v || !previewUrl) return;
    if (!v.getAttribute("src")) v.src = previewUrl;
  }, [status, previewUrl]);

  const prevStatus = useRef(status);
  useEffect(() => {
    if (status === "success" && prevStatus.current !== "success") onUploadSuccess();
    prevStatus.current = status;
  }, [status, onUploadSuccess]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  const estimate = selectedFile ? selectedFile.size * Math.max(0.12, quality / 100) : 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center md:items-center">
      <div
        className="absolute inset-0 bg-zinc-900/45 backdrop-blur-sm"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div className="relative flex max-h-[90vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl md:max-h-[85vh] md:max-w-xl md:rounded-3xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 pt-5 pb-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Сжать видео</h3>
            <p className="mt-0.5 text-xs text-zinc-500">Положим в текущую папку</p>
          </div>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100"
            onClick={onClose}
            disabled={busy}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={cn(
                "flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed p-8 text-center",
                isDragActive ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300",
              )}
            >
              <input {...getInputProps()} />
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-zinc-50 ring-1 ring-zinc-100">
                <Upload className="size-6 text-zinc-500" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-800">Выберите ролик</h4>
              <p className="mt-1 max-w-[220px] text-xs text-zinc-500">С телефона — из Фото. На компьютере можно перетащить.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-black">
                {poster && busy ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poster} alt="" className="max-h-full max-w-full object-contain" />
                ) : previewUrl ? (
                  <video
                    ref={videoRef}
                    src={previewUrl}
                    playsInline
                    muted
                    preload="metadata"
                    className="max-h-full max-w-full object-contain"
                    onEnded={() => setIsPlaying(false)}
                  />
                ) : null}
                {!busy && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!videoRef.current) return;
                      if (isPlaying) videoRef.current.pause();
                      else void videoRef.current.play();
                      setIsPlaying(!isPlaying);
                    }}
                    className="absolute flex size-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md"
                  >
                    {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
                  </button>
                )}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-[10px] text-white">
                  <Video className="size-3" />
                  {selectedFile.name}
                </div>
              </div>

              {status === "no_support" ? (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                  Сжатие в этом браузере недоступно. Можно загрузить как есть или открыть с компьютера в Chrome / Edge.
                </div>
              ) : ["idle", "error"].includes(status) ? (
                <div className="space-y-3 rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-semibold text-zinc-800">Качество</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPreset(p.id)}
                        className={cn(
                          "rounded-xl px-2 py-2.5 text-center ring-1",
                          preset === p.id ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-zinc-700 ring-zinc-200",
                        )}
                      >
                        <span className="block text-xs font-semibold">{p.label}</span>
                        <span className={cn("mt-0.5 block text-[10px]", preset === p.id ? "text-white/70" : "text-zinc-400")}>
                          {p.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {formatBytes(originalSize || selectedFile.size)} → примерно {formatBytes(estimate)}
                  </p>
                </div>
              ) : null}

              {(status === "compressing" || status === "uploading" || status === "success") && (
                <div className="space-y-4 rounded-2xl border border-zinc-100 p-4">
                  <p className="text-xs text-zinc-500">
                    {status === "uploading" && !compressionProgress
                      ? "Отправляем оригинал, не сворачивайте телефон"
                      : "Сжатие идёт, не сворачивайте телефон"}
                  </p>
                  {status === "compressing" || compressionProgress > 0 ? (
                    <Stage label="Сжимаем" active={status === "compressing"} done={status === "uploading" || status === "success"} pct={compressionProgress} />
                  ) : null}
                  <Stage label="Отправляем" active={status === "uploading"} done={status === "success"} pct={uploadProgress} />
                  {status === "success" && compressedSize ? (
                    <p className="text-xs font-medium text-emerald-700">
                      {formatBytes(originalSize)} → {formatBytes(compressedSize)}
                    </p>
                  ) : null}
                </div>
              )}

              {status === "error" && error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-100 p-5">
          {status === "success" ? (
            <button type="button" className="h-12 w-full rounded-2xl bg-zinc-900 text-sm font-semibold text-white" onClick={onClose}>
              Показать в папке
            </button>
          ) : busy ? (
            <button type="button" className="h-12 w-full rounded-2xl border border-red-200 text-sm font-medium text-red-600" onClick={abort}>
              Отменить
            </button>
          ) : status === "error" && canUploadRaw && selectedFile ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="h-12 rounded-2xl border border-zinc-200 text-sm font-medium text-zinc-800"
                onClick={handleCompress}
              >
                Ещё раз
              </button>
              <button type="button" className="h-12 rounded-2xl bg-zinc-900 text-sm font-semibold text-white" onClick={handleUploadRaw}>
                Как есть
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="h-12 w-full rounded-2xl bg-zinc-900 text-sm font-semibold text-white disabled:opacity-40"
              onClick={handleCompress}
              disabled={!selectedFile}
            >
              Сжать и загрузить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stage({ label, active, done, pct }: { label: string; active: boolean; done: boolean; pct: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-semibold">
        <span className={cn("flex items-center gap-1.5", active ? "text-zinc-900" : "text-zinc-400")}>
          {active && <Loader2 className="size-3.5 animate-spin" />}
          {done && <CheckCircle2 className="size-3.5 text-emerald-500" />}
          {label}
        </span>
        <span className="text-zinc-500">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div
          className={cn("h-full rounded-full transition-[width] duration-150 ease-linear", done ? "bg-emerald-500" : "bg-zinc-800")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
