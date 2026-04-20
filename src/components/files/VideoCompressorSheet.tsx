"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, Loader2, CheckCircle2, AlertCircle, Video, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVideoCompressor } from "./useVideoCompressor";

interface VideoCompressorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrefix: string;
  onUploadSuccess: () => void;
}

export function VideoCompressorSheet({ isOpen, onClose, currentPrefix, onUploadSuccess }: VideoCompressorSheetProps) {
  const {
    status,
    compressionProgress,
    uploadProgress,
    originalSize,
    compressedSize,
    error,
    compressAndUpload,
    reset,
    abort
  } = useVideoCompressor();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(50); // 1-100
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (!isOpen) {
      setSelectedFile(null);
      setQuality(50);
      reset();
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      reset();
    }
  }, [reset]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [] },
    maxFiles: 1,
    disabled: status === "compressing" || status === "uploading",
  });

  const handleCompress = () => {
    if (!selectedFile) return;
    compressAndUpload(selectedFile, quality, currentPrefix).then(() => {
        // We handle success inside the hook, we can just optionally wait 
        // to call parent's onUploadSuccess
    });
  };

  useEffect(() => {
    if (status === "success") {
       onUploadSuccess();
    }
  }, [status, onUploadSuccess]);

  const formatSize = (bytes?: number | null) => {
    if (bytes === undefined || bytes === null) return "—";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { if(status !== 'compressing' && status !== 'uploading') onClose(); }} />

      <div className="relative w-full md:max-w-xl bg-white rounded-t-3xl md:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300 flex flex-col max-h-[90vh] md:max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Video className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Сжатие видео</h3>
              <p className="text-xs text-zinc-500 mt-0.5">App Router + Mediabunny (WebCodecs)</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
            onClick={onClose}
            disabled={status === "compressing" || status === "uploading"}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          
          {/* Dropzone or Preview */}
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
                isDragActive ? "border-indigo-500 bg-indigo-50/50" : "border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50"
              )}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-zinc-100 flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-indigo-400" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-800 mb-1">Загрузите видео</h4>
              <p className="text-xs text-zinc-500 max-w-[200px]">Перетащите файл сюда или нажмите для выбора</p>
            </div>
          ) : (
            <div className="space-y-4">
               {/* Video Preview */}
               <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center group">
                  <video 
                    ref={videoRef}
                    src={URL.createObjectURL(selectedFile)}
                    className="max-w-full max-h-full object-contain"
                    onEnded={() => setIsPlaying(false)}
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors">
                      {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-1" />}
                    </button>
                  </div>
                  {/* File badge */}
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/50 backdrop-blur-md text-[10px] font-medium text-white flex items-center gap-1.5">
                    <Video className="w-3 h-3" />
                    {selectedFile.name}
                  </div>
               </div>

               {/* Quality Slider (only show if not processing) */}
               {["idle", "error", "no_support"].includes(status) ? (
                 <div className="space-y-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                    <div className="flex justify-between items-end">
                       <div>
                         <label className="text-xs font-semibold text-zinc-800 block mb-1">Качество и битрейт ({quality}%)</label>
                         <p className="text-[10px] text-zinc-500">Чем меньше %, тем сильнее сжатие.</p>
                       </div>
                       <div className="text-xs font-medium text-zinc-600">
                          {formatSize(originalSize || selectedFile.size)} → ~{formatSize((selectedFile.size * Math.max(0.1, quality/100)))}
                       </div>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={quality} 
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                 </div>
               ) : null}

               {/* Progress UI */}
               {(status === "compressing" || status === "uploading" || status === "success") && (
                 <div className="space-y-4 p-4 rounded-2xl border border-zinc-100 bg-white shadow-sm">
                    {/* Stage 1: Compression */}
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs font-semibold">
                          <span className={cn("flex items-center gap-1.5", status === "compressing" ? "text-indigo-600" : "text-zinc-400")}>
                             {status === "compressing" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                             {(status === "uploading" || status === "success") && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                             Сжатие видео...
                          </span>
                          <span className="text-zinc-500">{compressionProgress}%</span>
                       </div>
                       <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${compressionProgress}%` }}
                          />
                       </div>
                    </div>

                    {/* Stage 2: Upload */}
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs font-semibold">
                          <span className={cn("flex items-center gap-1.5", status === "uploading" ? "text-indigo-600" : "text-zinc-400")}>
                             {status === "uploading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                             {status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                             Ожидание...
                             {status === "compressing" ? null : "Загрузка в R2..."}
                          </span>
                          <span className="text-zinc-500">{uploadProgress}%</span>
                       </div>
                       <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-300", status === "success" ? "bg-emerald-500" : "bg-indigo-500")}
                            style={{ width: `${uploadProgress}%` }}
                          />
                       </div>
                    </div>

                    {/* End size */}
                    {status === "success" && compressedSize && (
                      <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                         <span>Итоговый размер:</span>
                         <span className="font-semibold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-md">
                           {formatSize(originalSize)} → {formatSize(compressedSize)} ({(100 - (compressedSize / (originalSize || 1)) * 100).toFixed(1)}% сжатия)
                         </span>
                      </div>
                    )}
                 </div>
               )}

               {/* Error */}
               {status === "error" && error && (
                 <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-start gap-2">
                   <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                   {error}
                 </div>
               )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-100 shrink-0">
           {status === "success" ? (
              <Button className="w-full rounded-2xl h-12 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm" onClick={onClose}>
                Завершить
              </Button>
           ) : status === "compressing" || status === "uploading" ? (
              <Button variant="outline" className="w-full rounded-2xl h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={abort}>
                Отменить
              </Button>
           ) : (
              <Button 
                className="w-full rounded-2xl h-12 bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm font-semibold transition-all disabled:opacity-50"
                onClick={handleCompress}
                disabled={!selectedFile || status === "no_support"}
              >
                Сжать и загрузить в R2
              </Button>
           )}
        </div>
        
      </div>
    </div>
  );
}
