"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import imageCompression from "browser-image-compression";
import { saveAs } from "file-saver";
import {
  encodeStoragePath,
  fileLabel,
  formatBytes,
  isDocName,
  isImageName,
  isVideoName,
  safeFileName,
} from "@/lib/files/displayName";

export interface S3Object {
  name: string;
  path: string;
  type: "folder" | "file";
  size?: number;
  lastModified?: string;
}

export type FileStatus = "pending" | "compressing" | "ready" | "uploading" | "success" | "error";
export type ViewMode = "grid" | "list";
export type SortMode = "date" | "name" | "size";
export type TypeFilter = "all" | "image" | "video" | "doc";

export interface StagedFile {
  file: File;
  originalSize: number;
  compressedSize?: number;
  status: FileStatus;
  progress: number;
  id: string;
  keepOriginal?: boolean;
  error?: string;
}

export type ActionResult = { ok: true; warning?: string } | { ok: false; error: string };

const VIEW_KEY = "bac-files-view";
const SORT_KEY = "bac-files-sort";

function readPref<T extends string>(key: string, fallback: T, allowed: T[]): T {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  return allowed.includes(v as T) ? (v as T) : fallback;
}

async function authHeader() {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error("Сессия истекла, войдите снова");
  return { Authorization: `Bearer ${token}`, token };
}

export function useFileManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPrefix = searchParams.get("path") || "";

  const [items, setItems] = useState<S3Object[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [hiddenFolders, setHiddenFolders] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [compressImages, setCompressImages] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [groupByDate, setGroupByDate] = useState(true);
  const cacheRef = useRef<Map<string, S3Object[]>>(new Map());

  useEffect(() => {
    setViewMode(readPref<ViewMode>(VIEW_KEY, "grid", ["grid", "list"]));
    setSortMode(readPref<SortMode>(SORT_KEY, "date", ["date", "name", "size"]));
  }, []);

  const persistView = (v: ViewMode) => {
    setViewMode(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };
  const persistSort = (v: SortMode) => {
    setSortMode(v);
    try {
      window.localStorage.setItem(SORT_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const fetchSettings = useCallback(async () => {
    try {
      if (!db) return;
      const docRef = doc(db, "settings", "fileManager");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setHiddenFolders(docSnap.data().hiddenFolders || []);
    } catch (e) {
      console.error("Error fetching settings:", e);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const fetchItems = useCallback(async (prefix: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent && !cacheRef.current.has(prefix)) setLoading(true);
    setError(null);
    setSelectedPaths(new Set());
    try {
      const { Authorization } = await authHeader();
      const res = await fetch(`/api/s3/list?prefix=${encodeURIComponent(prefix)}`, {
        headers: { Authorization },
      });
      if (res.status === 401) throw new Error("Сессия истекла, войдите снова");
      if (!res.ok) throw new Error("Не удалось загрузить файлы. Проверьте соединение.");
      const data = await res.json();
      const next: S3Object[] = data.items || [];
      cacheRef.current.set(prefix, next);
      setItems(next);
      setTruncated(Boolean(data.truncated));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось загрузить файлы. Проверьте соединение.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cacheRef.current.has(currentPrefix)) {
      setItems(cacheRef.current.get(currentPrefix)!);
      setLoading(false);
    }
    void fetchItems(currentPrefix, { silent: cacheRef.current.has(currentPrefix) });
  }, [currentPrefix, fetchItems]);

  const navigateTo = useCallback(
    (prefix: string) => {
      setSearchQuery("");
      const url = prefix ? `/files?path=${encodeURIComponent(prefix)}` : "/files";
      router.push(url, { scroll: false });
    },
    [router],
  );

  const navigateToFolder = useCallback((folder: S3Object) => navigateTo(folder.path), [navigateTo]);

  const navigateUp = useCallback(() => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split("/").filter(Boolean);
    parts.pop();
    navigateTo(parts.length > 0 ? `${parts.join("/")}/` : "");
  }, [currentPrefix, navigateTo]);

  const breadcrumbs = currentPrefix.split("/").filter(Boolean);

  const displayedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let next = items.filter((item) => {
      if (item.type === "folder" && !showHidden && hiddenFolders.includes(item.path)) return false;
      if (q) {
        const hay = `${fileLabel(item.name)} ${item.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (item.type === "file" && typeFilter !== "all") {
        if (typeFilter === "image" && !isImageName(item.name)) return false;
        if (typeFilter === "video" && !isVideoName(item.name)) return false;
        if (typeFilter === "doc" && !isDocName(item.name)) return false;
      }
      if (item.type === "folder" && typeFilter !== "all" && q === "") return false;
      return true;
    });

    const byName = (a: S3Object, b: S3Object) =>
      fileLabel(a.name).localeCompare(fileLabel(b.name), "ru", { sensitivity: "base", numeric: true });
    const byDate = (a: S3Object, b: S3Object) => {
      const da = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const db = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return db - da;
    };

    if (sortMode === "name") {
      next = [...next].sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return byName(a, b);
      });
    } else if (sortMode === "size") {
      next = [...next].sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return (b.size || 0) - (a.size || 0);
      });
    } else {
      next = [...next].sort(byDate);
    }
    return next;
  }, [items, showHidden, hiddenFolders, searchQuery, typeFilter, sortMode]);

  const toggleSelection = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const selectRange = useCallback(
    (toPath: string, additive: boolean) => {
      const paths = displayedItems.map((i) => i.path);
      const to = paths.indexOf(toPath);
      if (to < 0) return;
      setSelectedPaths((prev) => {
        const next = additive ? new Set(prev) : new Set<string>();
        const selectedIdx = paths.map((p, i) => (prev.has(p) ? i : -1)).filter((i) => i >= 0);
        const from = selectedIdx.length ? selectedIdx[selectedIdx.length - 1] : to;
        const [a, b] = from < to ? [from, to] : [to, from];
        for (let i = a; i <= b; i++) next.add(paths[i]);
        return next;
      });
    },
    [displayedItems],
  );

  const toggleSelectAll = useCallback(() => {
    setSelectedPaths((prev) =>
      prev.size === displayedItems.length && displayedItems.length > 0
        ? new Set()
        : new Set(displayedItems.map((i) => i.path)),
    );
  }, [displayedItems]);

  const clearSelection = useCallback(() => setSelectedPaths(new Set()), []);

  const handleCreateFolder = async (name: string): Promise<ActionResult> => {
    try {
      const { Authorization } = await authHeader();
      const res = await fetch("/api/s3/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization },
        body: JSON.stringify({ prefix: currentPrefix, folderName: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) return { ok: false, error: data.error || "Такая папка уже есть" };
      if (!res.ok) return { ok: false, error: data.error || "Не удалось создать папку" };
      await fetchItems(currentPrefix, { silent: true });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Не удалось создать папку" };
    }
  };

  const handleRename = async (item: S3Object, newName: string): Promise<ActionResult> => {
    const clean = safeFileName(newName.trim());
    if (!clean) return { ok: false, error: "Имя не может быть пустым" };
    if (clean === item.name || clean === fileLabel(item.name)) return { ok: true };
    const parent =
      item.type === "folder"
        ? item.path.slice(0, item.path.length - item.name.length - 1)
        : item.path.slice(0, item.path.length - item.name.length);
    const newKey = item.type === "folder" ? `${parent}${clean}/` : `${parent}${clean}`;

    try {
      const { Authorization } = await authHeader();
      const res = await fetch("/api/s3/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization },
        body: JSON.stringify({ oldKey: item.path, newKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || "Не удалось переименовать" };

      if (item.type === "folder" && hiddenFolders.includes(item.path)) {
        const nextHidden = hiddenFolders.map((p) => (p === item.path ? newKey : p));
        setHiddenFolders(nextHidden);
        if (db) {
          await setDoc(doc(db, "settings", "fileManager"), { hiddenFolders: nextHidden }, { merge: true });
        }
      }

      await fetchItems(currentPrefix, { silent: true });
      return data.warning ? { ok: true, warning: data.warning } : { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Не удалось переименовать" };
    }
  };

  const handleDeleteSelected = async (): Promise<ActionResult> => {
    try {
      const { Authorization } = await authHeader();
      const res = await fetch("/api/s3/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization },
        body: JSON.stringify({ keys: Array.from(selectedPaths) }),
      });
      if (!res.ok) return { ok: false, error: "Не удалось удалить" };
      await fetchItems(currentPrefix, { silent: true });
      setSelectedPaths(new Set());
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Не удалось удалить" };
    }
  };

  const stageFiles = useCallback(
    async (acceptedFiles: File[], opts?: { keepOriginal?: boolean }) => {
      if (acceptedFiles.length === 0) return;
      const keepOriginal = opts?.keepOriginal ?? !compressImages;
      const newStaged: StagedFile[] = acceptedFiles.map((file) => ({
        file,
        originalSize: file.size,
        status: "pending",
        progress: 0,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        keepOriginal,
      }));
      setStagedFiles((prev) => [...prev, ...newStaged]);

      for (const item of newStaged) {
        const canCompress =
          !item.keepOriginal &&
          item.file.type.startsWith("image/") &&
          !/heic|heif/i.test(item.file.type) &&
          !/\.hei[cf]$/i.test(item.file.name);
        if (canCompress) {
          setStagedFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "compressing" } : f)));
          try {
            const compressed = await imageCompression(item.file, {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            });
            const renamedFile = new File([compressed], item.file.name, { type: compressed.type || item.file.type });
            setStagedFiles((prev) =>
              prev.map((f) =>
                f.id === item.id
                  ? { ...f, file: renamedFile, compressedSize: compressed.size, status: "ready" }
                  : f,
              ),
            );
          } catch {
            setStagedFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "ready" } : f)));
          }
        } else {
          setStagedFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "ready" } : f)));
        }
      }
    },
    [compressImages],
  );

  const uploadViaPresigned = (file: File, token: string, onProgress: (pct: number) => void) =>
    new Promise<void>(async (resolve, reject) => {
      try {
        const presigned = await fetch("/api/s3/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
            prefix: currentPrefix,
          }),
        });
        const data = await presigned.json().catch(() => ({}));
        if (!presigned.ok || !data.url) {
          reject(new Error(data.error || "Не удалось получить ссылку для загрузки"));
          return;
        }
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Ошибка загрузки (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Сеть оборвалась во время загрузки"));
        xhr.open("PUT", data.url);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      } catch (e) {
        reject(e);
      }
    });

  const handleUploadAll = async (): Promise<ActionResult> => {
    setUploading(true);
    try {
      const { token } = await authHeader();
      const toUpload = stagedFiles.filter((f) => f.status === "ready" || f.status === "error");
      let failed = 0;
      await Promise.all(
        toUpload.map(async (item) => {
          setStagedFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", progress: 0, error: undefined } : f)),
          );
          try {
            await uploadViaPresigned(item.file, token, (pct) => {
              setStagedFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f)));
            });
            setStagedFiles((prev) =>
              prev.map((f) => (f.id === item.id ? { ...f, status: "success", progress: 100 } : f)),
            );
          } catch (e) {
            failed += 1;
            setStagedFiles((prev) =>
              prev.map((f) =>
                f.id === item.id
                  ? { ...f, status: "error", error: e instanceof Error ? e.message : "Ошибка" }
                  : f,
              ),
            );
          }
        }),
      );
      await fetchItems(currentPrefix, { silent: true });
      if (failed > 0) return { ok: false, error: `Не вышло у ${failed} из ${toUpload.length}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Ошибка загрузки" };
    } finally {
      setUploading(false);
    }
  };

  const removeStagedFile = (id: string) => setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  const clearStagedFiles = () => setStagedFiles([]);
  const retryUpload = (id: string) =>
    setStagedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "ready", progress: 0, error: undefined } : f)));

  const handleDownloadFile = async (key: string): Promise<ActionResult> => {
    try {
      const { Authorization } = await authHeader();
      const res = await fetch(`/api/s3/download?path=${encodeURIComponent(key)}`, { headers: { Authorization } });
      if (res.status === 401) return { ok: false, error: "Сессия истекла, войдите снова" };
      if (!res.ok) return { ok: false, error: "Не удалось скачать" };
      const data = await res.json();
      if (!data.url) return { ok: false, error: "Не удалось скачать" };
      const downloadRes = await fetch(data.url);
      if (!downloadRes.ok) return { ok: false, error: "Не удалось скачать" };
      const blob = await downloadRes.blob();
      saveAs(blob, data.downloadName || fileLabel(key));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Не удалось скачать" };
    }
  };

  const handleDownloadSelected = async (): Promise<ActionResult> => {
    const files = items.filter((i) => selectedPaths.has(i.path) && i.type === "file");
    const skippedFolders = Array.from(selectedPaths).some((p) => items.find((i) => i.path === p)?.type === "folder");
    if (files.length === 0) {
      return { ok: false, error: skippedFolders ? "Папки не скачиваются — зайдите внутрь" : "Нет файлов для скачивания" };
    }
    setIsDownloading(true);
    setDownloadProgress({ done: 0, total: files.length });
    let failed = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const result = await handleDownloadFile(files[i].path);
        if (!result.ok) failed += 1;
        setDownloadProgress({ done: i + 1, total: files.length });
        if (i < files.length - 1) await new Promise((r) => setTimeout(r, 280));
      }
      if (failed > 0) return { ok: false, error: `Не скачалось: ${failed} из ${files.length}` };
      return skippedFolders ? { ok: true, warning: "Папки пропущены — скачаны только файлы" } : { ok: true };
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const toggleFolderVisibility = async (folderPath: string): Promise<ActionResult> => {
    try {
      if (!db) return { ok: false, error: "Нет доступа к настройкам" };
      const isHidden = hiddenFolders.includes(folderPath);
      const next = isHidden ? hiddenFolders.filter((p) => p !== folderPath) : [...hiddenFolders, folderPath];
      setHiddenFolders(next);
      await setDoc(doc(db, "settings", "fileManager"), { hiddenFolders: next }, { merge: true });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Не удалось скрыть папку" };
    }
  };

  const getPublicUrl = (path: string) => {
    const base = (process.env.NEXT_PUBLIC_CLOUDFLARE_R2_DEV_URL || "").replace(/\/$/, "");
    if (!base) return "";
    return `${base}/${encodeStoragePath(path)}`;
  };

  const images = displayedItems.filter((i) => i.type === "file" && isImageName(i.name));
  const videos = displayedItems.filter((i) => i.type === "file" && isVideoName(i.name));

  const isAnyCompressing = stagedFiles.some((f) => f.status === "compressing");
  const isAnyReady = stagedFiles.some((f) => f.status === "ready" || f.status === "error");
  const allSuccess = stagedFiles.length > 0 && stagedFiles.every((f) => f.status === "success");
  const hiddenCount = items.filter((i) => i.type === "folder" && hiddenFolders.includes(i.path)).length;

  const handleSearchChange = (q: string) => setSearchQuery(q);

  return {
    currentPrefix,
    items,
    displayedItems,
    images,
    videos,
    truncated,
    loading,
    error,
    uploading,
    isDownloading,
    downloadProgress,
    selectedPaths,
    hiddenFolders,
    hiddenCount,
    showHidden,
    setShowHidden,
    stagedFiles,
    compressImages,
    setCompressImages,
    searchQuery,
    handleSearchChange,
    breadcrumbs,
    isAnyCompressing,
    isAnyReady,
    allSuccess,
    viewMode,
    setViewMode: persistView,
    sortMode,
    setSortMode: persistSort,
    typeFilter,
    setTypeFilter,
    groupByDate,
    setGroupByDate,
    navigateToFolder,
    navigateUp,
    navigateTo,
    toggleSelection,
    selectRange,
    toggleSelectAll,
    clearSelection,
    handleCreateFolder,
    handleRename,
    handleDeleteSelected,
    stageFiles,
    handleUploadAll,
    removeStagedFile,
    clearStagedFiles,
    retryUpload,
    handleDownloadFile,
    handleDownloadSelected,
    toggleFolderVisibility,
    getPublicUrl,
    formatSize: formatBytes,
    fetchItems,
  };
}
