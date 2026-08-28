import { useState, useCallback, useRef } from "react";
import {
  Conversion,
  Input,
  Output,
  BufferTarget,
  BlobSource,
  Mp4OutputFormat,
  ALL_FORMATS,
  ConversionOptions,
  OutputOptions,
  ConversionVideoOptions,
  ConversionAudioOptions,
} from "mediabunny";
import { auth } from "@/lib/firebase";
import { safeFileName } from "@/lib/files/displayName";

export type VideoCompressorStatus = "idle" | "compressing" | "uploading" | "success" | "error" | "no_support";

interface UseVideoCompressorResult {
  status: VideoCompressorStatus;
  compressionProgress: number;
  uploadProgress: number;
  originalSize: number | null;
  compressedSize: number | null;
  error: string | null;
  compressAndUpload: (file: File, quality: number, prefix: string) => Promise<void>;
  reset: () => void;
  abort: () => void;
}

export function useVideoCompressor(): UseVideoCompressorResult {
  const [status, setStatus] = useState<VideoCompressorStatus>("idle");
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const conversionRef = useRef<Conversion | null>(null);

  const isSupported = typeof window !== "undefined" && "VideoEncoder" in window;

  const reset = useCallback(() => {
    setStatus(isSupported ? "idle" : "no_support");
    setCompressionProgress(0);
    setUploadProgress(0);
    setOriginalSize(null);
    setCompressedSize(null);
    setError(null);
    if (xhrRef.current) xhrRef.current.abort();
    if (conversionRef.current && conversionRef.current.cancel) conversionRef.current.cancel();
  }, [isSupported]);

  const abort = useCallback(() => {
    if (xhrRef.current) xhrRef.current.abort();
    if (conversionRef.current && conversionRef.current.cancel) conversionRef.current.cancel();
    setStatus("error");
    setError("Отменено");
  }, []);

  const compressAndUpload = useCallback(
    async (file: File, quality: number, prefix: string) => {
      if (!isSupported) {
        setStatus("no_support");
        setError("Сжатие в этом браузере недоступно. Откройте Chrome или Edge на компьютере.");
        return;
      }

      try {
        reset();
        setOriginalSize(file.size);
        setStatus("compressing");

        const MAX_BITRATE = 8_000_000;
        const MIN_BITRATE = 300_000;
        const targetBitrate = Math.max(MIN_BITRATE, Math.min(MAX_BITRATE, (quality / 100) * MAX_BITRATE));

        const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });

        const outputFormat: ConversionVideoOptions = {
          codec: "avc",
          bitrate: targetBitrate,
        };

        const outputAudio: ConversionAudioOptions = {
          codec: "aac",
          bitrate: 128_000,
        };

        const outputOptions: OutputOptions<Mp4OutputFormat, BufferTarget> = {
          target: new BufferTarget(),
          format: new Mp4OutputFormat(),
        };

        const output = new Output(outputOptions);

        const conversionOptions: ConversionOptions = {
          input,
          output,
          video: outputFormat,
          audio: outputAudio,
        };

        const conversion = await Conversion.init(conversionOptions);
        conversionRef.current = conversion;

        conversion.onProgress = (progress: number) => {
          setCompressionProgress(Math.min(100, Math.round(progress * 100)));
        };

        await conversion.execute();
        setCompressionProgress(100);

        const outputBuffer = outputOptions.target.buffer;
        if (!outputBuffer) throw new Error("Не удалось сжать видео");

        const compressedBlob = new Blob([outputBuffer], { type: "video/mp4" });
        setCompressedSize(compressedBlob.size);

        setStatus("uploading");

        const token = await auth?.currentUser?.getIdToken();
        if (!token) throw new Error("Сессия истекла, войдите снова");

        const base = safeFileName(file.name.replace(/\.[^.]+$/, "") || "video");
        const presignedRes = await fetch("/api/s3/presigned", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: `${base}.mp4`,
            contentType: "video/mp4",
            prefix,
          }),
        });

        const presignedData = await presignedRes.json().catch(() => ({}));
        if (!presignedRes.ok || !presignedData.url) {
          throw new Error(presignedData.error || "Не удалось получить ссылку для загрузки");
        }

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setStatus("success");
              setUploadProgress(100);
              resolve();
            } else {
              reject(new Error(`Ошибка загрузки (${xhr.status})`));
            }
          };

          xhr.onerror = () => reject(new Error("Сеть оборвалась во время загрузки"));
          xhr.onabort = () => reject(new Error("Upload aborted"));

          xhr.open("PUT", presignedData.url);
          xhr.setRequestHeader("Content-Type", "video/mp4");
          xhr.send(compressedBlob);
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Не получилось сжать или загрузить видео";
        if (errorMessage !== "Upload aborted") {
          setStatus("error");
          setError(errorMessage);
        }
      }
    },
    [reset, isSupported],
  );

  return {
    status,
    compressionProgress,
    uploadProgress,
    originalSize,
    compressedSize,
    error,
    compressAndUpload,
    reset,
    abort,
  };
}
