import { useState, useCallback, useRef } from 'react';
import { Conversion, Input, Output, BufferTarget, BlobSource, Mp4OutputFormat, ALL_FORMATS } from 'mediabunny';
import { auth } from '@/lib/firebase';

export type VideoCompressorStatus = 'idle' | 'compressing' | 'uploading' | 'success' | 'error' | 'no_support';

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
  const [status, setStatus] = useState<VideoCompressorStatus>('idle');
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  // Optional: keep track of conversion process to abort
  const conversionRef = useRef<any>(null);

  // Fallback check: WebCodecs VideoEncoder is needed
  const isSupported = typeof window !== 'undefined' && 'VideoEncoder' in window;

  const reset = useCallback(() => {
    setStatus(isSupported ? 'idle' : 'no_support');
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
    setStatus('error');
    setError('Отменено пользователем');
  }, []);

  const compressAndUpload = useCallback(async (file: File, quality: number, prefix: string) => {
    if (!isSupported) {
      setStatus('no_support');
      setError('Ваш браузер не поддерживает WebCodecs. Пожалуйста, используйте свежую версию Chrome или Edge.');
      return;
    }

    try {
      reset();
      setOriginalSize(file.size);
      setStatus('compressing');
      
      // Calculate target bitrate based on original size and quality
      // If quality is 100, we aim for ~80% of original. If quality is 50, we aim for ~40% of original.
      // Usually quality 0-100 translates to a bitrate easily. We assume an average video takes 1MB per second at 8Mbps.
      // We will define a basic heuristic for bitrate, or dynamic calculation.
      // 100 quality -> very high bitrate, 1 quality -> 100kbps
      const baseBitrate = file.size * 8 / 10; // rough guess of total original bits if duration ~10s (this is flawed without duration)
      // Standard safe bitrates for web: 1000kbps (low) up to 8000kbps(high).
      const MAX_BITRATE = 8_000_000;
      const MIN_BITRATE = 300_000;
      const targetBitrate = Math.max(MIN_BITRATE, Math.min(MAX_BITRATE, (quality / 100) * MAX_BITRATE));

      // According to user: "new MB.Output({ ... })"
      // Also, progress can be tracked. Example snippet for typical mediabunny:
      const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS } as any);
      
      const outputFormat = {
         codec: 'avc',
         bitrate: targetBitrate 
      };

      const outputOptions: any = {
        target: new BufferTarget(),
        format: new Mp4OutputFormat(),
        video: outputFormat,
        audio: {
          codec: 'aac',
          bitrate: 128_000, 
        }
      };
      
      const output = new Output(outputOptions);
      
      const conversionOptions = {
        input,
        output,
        video: outputFormat,
        audio: {
          codec: 'aac',
          bitrate: 128_000, 
        }
      };

      const conversion = 'init' in Conversion ? await (Conversion as any).init(conversionOptions) : new (Conversion as any)(conversionOptions);
      conversionRef.current = conversion;
      
      let compressionPercent = 0;
      conversion.onprogress = (e: any) => {
        // e might have ratio/percentage
        if (e && typeof e.progress === 'number') {
          compressionPercent = Math.min(100, Math.round(e.progress * 100));
          setCompressionProgress(compressionPercent);
        } else if (e === undefined) {
          // hacky simulate progress if no progress event natively
          compressionPercent = Math.min(99, compressionPercent + 5);
          setCompressionProgress(compressionPercent);
        }
      };

      // Ensure we hit 100
      await conversion.start();
      setCompressionProgress(100);

      // We get it from target.buffer
      const outputBuffer = outputOptions.target.buffer;
      const compressedBlob = new Blob([outputBuffer], { type: 'video/mp4' });
      setCompressedSize(compressedBlob.size);
      
      setStatus('uploading');
      
      const token = await auth?.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const presignedRes = await fetch('/api/s3/presigned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: 'video/mp4',
          prefix,
        })
      });

      if (!presignedRes.ok) throw new Error('Failed to get presigned URL. Server returned ' + presignedRes.status);
      
      const presignedData = await presignedRes.json();
      if (!presignedData.success) throw new Error(presignedData.error || 'Failed to generate URL');
      const { url } = presignedData;
      
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
            setStatus('success');
            setUploadProgress(100);
            resolve();
          } else {
            console.error('Upload error response:', xhr.responseText);
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new Error('Upload aborted'));
        
        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', 'video/mp4');
        xhr.send(compressedBlob);
      });

    } catch (err: any) {
      if (err.message !== 'Upload aborted') {
        setStatus('error');
        setError(err.message || 'Произошла ошибка при сжатии или загрузке видео');
      }
    }
  }, [reset, isSupported]);

  return {
    status,
    compressionProgress,
    uploadProgress,
    originalSize,
    compressedSize,
    error,
    compressAndUpload,
    reset,
    abort
  };
}
