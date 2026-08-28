import { useState, useCallback, useRef } from "react";
import {
  Conversion,
  Input,
  Output,
  BufferTarget,
  BlobSource,
  Mp4OutputFormat,
  ALL_FORMATS,
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
  canUploadRaw: boolean;
  compressAndUpload: (file: File, quality: number, prefix: string) => Promise<void>;
  uploadRaw: (file: File, prefix: string) => Promise<void>;
  reset: () => void;
  abort: () => void;
}

function even(n: number) {
  return Math.max(2, n - (n % 2));
}

function maxSideForQuality(quality: number) {
  if (quality >= 75) return 1920;
  if (quality >= 45) return 1280;
  return 854;
}

function isDecodeFail(msg: string) {
  const s = msg.toLowerCase();
  return (
    s.includes("decoding error") ||
    s.includes("undecodable") ||
    s.includes("decoder error") ||
    s.includes("could not be decoded")
  );
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Не получилось сжать или загрузить видео";
  if (msg === "Upload aborted" || msg === "Отменено") return "Отменено";
  if (isDecodeFail(msg)) {
    return "Телефон не смог раскодировать ролик для сжатия. Так бывает с HEVC/HDR с камеры. Загрузите как есть — или сожмите с компьютера в Chrome.";
  }
  if (/no_encodable|encoding error|encoder/i.test(msg)) {
    return "Этот браузер не умеет сжимать видео. Загрузите как есть или откройте с компьютера в Chrome.";
  }
  if (/сессия истекла/i.test(msg)) return msg;
  return msg;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

export function useVideoCompressor(): UseVideoCompressorResult {
  const [status, setStatus] = useState<VideoCompressorStatus>("idle");
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canUploadRaw, setCanUploadRaw] = useState(false);

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const conversionRef = useRef<Conversion | null>(null);
  const abortFlag = useRef(false);

  const isSupported = typeof window !== "undefined" && "VideoEncoder" in window;

  const reset = useCallback(() => {
    abortFlag.current = false;
    setStatus(isSupported ? "idle" : "no_support");
    setCompressionProgress(0);
    setUploadProgress(0);
    setOriginalSize(null);
    setCompressedSize(null);
    setError(null);
    setCanUploadRaw(false);
    if (xhrRef.current) xhrRef.current.abort();
    if (conversionRef.current?.cancel) conversionRef.current.cancel();
  }, [isSupported]);

  const abort = useCallback(() => {
    abortFlag.current = true;
    if (xhrRef.current) xhrRef.current.abort();
    if (conversionRef.current?.cancel) conversionRef.current.cancel();
    setStatus("error");
    setError("Отменено");
  }, []);

  const putBlob = useCallback(async (blob: Blob, fileName: string, contentType: string, prefix: string) => {
    const token = await auth?.currentUser?.getIdToken();
    if (!token) throw new Error("Сессия истекла, войдите снова");

    const presignedRes = await fetch("/api/s3/presigned", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileName, contentType, prefix }),
    });
    const presignedData = await presignedRes.json().catch(() => ({}));
    if (!presignedRes.ok || !presignedData.url) {
      throw new Error(presignedData.error || "Не удалось получить ссылку для загрузки");
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          resolve();
        } else {
          reject(new Error(`Ошибка загрузки (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Сеть оборвалась во время загрузки"));
      xhr.onabort = () => reject(new Error("Upload aborted"));
      xhr.open("PUT", presignedData.url);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.send(blob);
    });
  }, []);

  const transcode = useCallback(
    async (
      file: File,
      quality: number,
      dropAudio: boolean,
      hardware: "no-preference" | "prefer-software",
    ): Promise<ArrayBuffer> => {
      const MAX_BITRATE = 8_000_000;
      const MIN_BITRATE = 300_000;
      const targetBitrate = Math.max(MIN_BITRATE, Math.min(MAX_BITRATE, (quality / 100) * MAX_BITRATE));

      const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) throw new Error("В файле нет видеодорожки");

      const cap = maxSideForQuality(quality);
      let width = videoTrack.displayWidth;
      let height = videoTrack.displayHeight;
      const long = Math.max(width, height);
      if (long > cap) {
        const scale = cap / long;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      width = even(width);
      height = even(height);

      const target = new BufferTarget();
      const output = new Output({
        format: new Mp4OutputFormat({ fastStart: "in-memory" }),
        target,
      });

      const conversion = await Conversion.init({
        input,
        output,
        showWarnings: false,
        video: {
          codec: "avc",
          bitrate: targetBitrate,
          width,
          height,
          fit: "contain",
          hardwareAcceleration: hardware,
          forceTranscode: true,
        },
        audio: dropAudio ? { discard: true } : { codec: "aac", bitrate: 128_000 },
      });
      conversionRef.current = conversion;

      const videoLost = conversion.discardedTracks.some((d) => d.track.isVideoTrack() && d.reason !== "discarded_by_user");
      if (videoLost || !conversion.isValid) {
        const reason = conversion.discardedTracks.map((d) => d.reason).join(", ") || "invalid";
        throw new Error(reason.includes("undecodable") ? "Decoding error." : reason);
      }

      conversion.onProgress = (progress: number) => {
        setCompressionProgress(Math.min(100, Math.round(progress * 100)));
      };

      await conversion.execute();
      if (!target.buffer) throw new Error("Не удалось сжать видео");
      return target.buffer;
    },
    [],
  );

  const compressAndUpload = useCallback(
    async (file: File, quality: number, prefix: string) => {
      if (!isSupported) {
        setStatus("no_support");
        setError("Сжатие в этом браузере недоступно. Откройте Chrome или Edge на компьютере.");
        setCanUploadRaw(true);
        return;
      }

      abortFlag.current = false;
      setOriginalSize(file.size);
      setCompressedSize(null);
      setError(null);
      setCanUploadRaw(false);
      setCompressionProgress(0);
      setUploadProgress(0);
      setStatus("compressing");

      const attempts: Array<{ dropAudio: boolean; hardware: "no-preference" | "prefer-software" }> = [
        { dropAudio: false, hardware: "no-preference" },
        { dropAudio: false, hardware: "prefer-software" },
        { dropAudio: true, hardware: "prefer-software" },
      ];

      let buffer: ArrayBuffer | null = null;
      let lastErr: unknown = null;

      for (let i = 0; i < attempts.length; i++) {
        if (abortFlag.current) {
          setStatus("error");
          setError("Отменено");
          return;
        }
        try {
          buffer = await transcode(file, quality, attempts[i].dropAudio, attempts[i].hardware);
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : "";
          if (msg === "Отменено" || abortFlag.current) {
            setStatus("error");
            setError("Отменено");
            return;
          }
          const retryable = isDecodeFail(msg) || /undecodable|no_encodable/i.test(msg);
          if (!retryable || i === attempts.length - 1) break;
          setCompressionProgress(0);
          await wait(80);
        }
      }

      if (!buffer) {
        setStatus("error");
        setError(friendlyError(lastErr));
        setCanUploadRaw(true);
        return;
      }

      try {
        setCompressionProgress(100);
        const compressedBlob = new Blob([buffer], { type: "video/mp4" });
        setCompressedSize(compressedBlob.size);
        setStatus("uploading");
        const base = safeFileName(file.name.replace(/\.[^.]+$/, "") || "video");
        await putBlob(compressedBlob, `${base}.mp4`, "video/mp4", prefix);
        if (abortFlag.current) {
          setStatus("error");
          setError("Отменено");
          return;
        }
        setStatus("success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "Upload aborted") return;
        setStatus("error");
        setError(friendlyError(err));
        setCanUploadRaw(true);
      }
    },
    [isSupported, putBlob, transcode],
  );

  const uploadRaw = useCallback(
    async (file: File, prefix: string) => {
      abortFlag.current = false;
      setError(null);
      setCanUploadRaw(false);
      setOriginalSize(file.size);
      setCompressedSize(file.size);
      setUploadProgress(0);
      setStatus("uploading");
      try {
        const name = safeFileName(file.name || "video.mp4");
        const type = file.type || "video/mp4";
        await putBlob(file, name, type, prefix);
        if (abortFlag.current) {
          setStatus("error");
          setError("Отменено");
          return;
        }
        setStatus("success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "Upload aborted") return;
        setStatus("error");
        setError(friendlyError(err));
        setCanUploadRaw(true);
      }
    },
    [putBlob],
  );

  return {
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
  };
}
