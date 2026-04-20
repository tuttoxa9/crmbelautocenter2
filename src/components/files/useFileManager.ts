"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import imageCompression from "browser-image-compression";
import { saveAs } from "file-saver";

export interface S3Object {
  name: string;
  path: string;
  type: "folder" | "file";
  size?: number;
  lastModified?: string;
}

export type FileStatus = "pending" | "compressing" | "ready" | "uploading" | "success" | "error";

export interface StagedFile {
  file: File;
  originalSize: number;
  compressedSize?: number;
  status: FileStatus;
  progress: number; // 0-100
  id: string; // unique key for stable react keys
}

export function useFileManager() {
  const [currentPrefix, setCurrentPrefix] = useState<string>("");
  const [items, setItems] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [hiddenFolders, setHiddenFolders] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ─── Settings ────────────────────────────────────────────────────────────────
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

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ─── Fetch Items ──────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async (prefix: string) => {
    setLoading(true);
    setError(null);
    setSelectedPaths(new Set());
    try {
      const token = await auth?.currentUser?.getIdToken();
      const res = await fetch(`/api/s3/list?prefix=${encodeURIComponent(prefix)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      console.error("Error fetching items:", e);
      setError("Не удалось загрузить файлы. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(currentPrefix); }, [currentPrefix, fetchItems]);

  // ─── Navigation ───────────────────────────────────────────────────────────────
  const navigateToFolder = (folder: S3Object) => setCurrentPrefix(folder.path);

  const navigateUp = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split("/").filter(Boolean);
    parts.pop();
    setCurrentPrefix(parts.length > 0 ? parts.join("/") + "/" : "");
  };

  const navigateTo = (prefix: string) => setCurrentPrefix(prefix);

  const breadcrumbs = currentPrefix.split("/").filter(Boolean);

  // ─── Displayed items (computed early so selection can use it) ─────────────────
  const displayedItems = items.filter((item) => {
    if (item.type === "folder" && !showHidden && hiddenFolders.includes(item.path)) return false;
    if (searchQuery) return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  // ─── Selection ────────────────────────────────────────────────────────────────
  const toggleSelection = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedPaths((prev) =>
      prev.size === displayedItems.length
        ? new Set()
        : new Set(displayedItems.map((i) => i.path))
    );
  }, [displayedItems]);

  const clearSelection = () => setSelectedPaths(new Set());

  // ─── Create Folder ────────────────────────────────────────────────────────────
  const handleCreateFolder = async (name: string) => {
    try {
      const token = await auth?.currentUser?.getIdToken();
      await fetch("/api/s3/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prefix: currentPrefix, folderName: name.trim() }),
      });
      await fetchItems(currentPrefix);
    } catch (e) {
      console.error("Error creating folder:", e);
    }
  };

  // ─── Rename ───────────────────────────────────────────────────────────────────
  const handleRename = async (item: S3Object, newName: string) => {
    const oldKey = item.path;
    const parentPrefix = oldKey.replace(item.name + (item.type === "folder" ? "/" : ""), "");
    const newKey = item.type === "folder"
      ? `${parentPrefix}${newName}/`
      : `${parentPrefix}${newName}`;

    try {
      const token = await auth?.currentUser?.getIdToken();
      const res = await fetch("/api/s3/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldKey, newKey }),
      });
      if (!res.ok) throw new Error("Rename failed");
      await fetchItems(currentPrefix);
    } catch (e) {
      console.error("Error renaming:", e);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────────
  const handleDeleteSelected = async () => {
    try {
      const token = await auth?.currentUser?.getIdToken();
      await fetch("/api/s3/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ keys: Array.from(selectedPaths) }),
      });
      await fetchItems(currentPrefix);
      setSelectedPaths(new Set());
    } catch (e) {
      console.error("Error deleting:", e);
    }
  };

  // ─── Upload ───────────────────────────────────────────────────────────────────
  const stageFiles = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const newStaged: StagedFile[] = acceptedFiles.map((file) => ({
      file,
      originalSize: file.size,
      status: "pending",
      progress: 0,
      id: `${Date.now()}-${Math.random()}`,
    }));

    setStagedFiles((prev) => [...prev, ...newStaged]);

    for (const item of newStaged) {
      if (item.file.type.startsWith("image/")) {
        setStagedFiles((prev) =>
          prev.map((f) => f.id === item.id ? { ...f, status: "compressing" } : f)
        );
        try {
          const compressed = await imageCompression(item.file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });
          const renamedFile = new File([compressed], item.file.name, { type: compressed.type });
          setStagedFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, file: renamedFile, compressedSize: compressed.size, status: "ready" }
                : f
            )
          );
        } catch {
          setStagedFiles((prev) =>
            prev.map((f) => f.id === item.id ? { ...f, status: "ready" } : f)
          );
        }
      } else {
        setStagedFiles((prev) =>
          prev.map((f) => f.id === item.id ? { ...f, status: "ready" } : f)
        );
      }
    }
  }, []);

  const handleUploadAll = async () => {
    setUploading(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const toUpload = stagedFiles.filter((f) => f.status === "ready" || f.status === "error");

      await Promise.all(
        toUpload.map(
          (item) =>
            new Promise<void>((resolve) => {
              setStagedFiles((prev) =>
                prev.map((f) => f.id === item.id ? { ...f, status: "uploading", progress: 0 } : f)
              );

              const formData = new FormData();
              formData.append("file", item.file);
              formData.append("prefix", currentPrefix);

              const xhr = new XMLHttpRequest();
              xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                  const pct = Math.round((e.loaded / e.total) * 100);
                  setStagedFiles((prev) =>
                    prev.map((f) => f.id === item.id ? { ...f, progress: pct } : f)
                  );
                }
              };
              xhr.onload = () => {
                const status = xhr.status === 200 ? "success" : "error";
                setStagedFiles((prev) =>
                  prev.map((f) => f.id === item.id ? { ...f, status, progress: 100 } : f)
                );
                resolve();
              };
              xhr.onerror = () => {
                setStagedFiles((prev) =>
                  prev.map((f) => f.id === item.id ? { ...f, status: "error" } : f)
                );
                resolve();
              };
              xhr.open("POST", "/api/s3/upload");
              xhr.setRequestHeader("Authorization", `Bearer ${token}`);
              xhr.send(formData);
            })
        )
      );

      await fetchItems(currentPrefix);
    } catch (e) {
      console.error("Upload error:", e);
    } finally {
      setUploading(false);
    }
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearStagedFiles = () => setStagedFiles([]);

  const retryUpload = (id: string) => {
    setStagedFiles((prev) =>
      prev.map((f) => f.id === id ? { ...f, status: "ready", progress: 0 } : f)
    );
  };

  // ─── Download ─────────────────────────────────────────────────────────────────
  const handleDownloadFile = async (key: string) => {
    try {
      const token = await auth?.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch(`/api/s3/download?path=${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const data = await res.json();
      const name = key.split("/").pop() || "file";
      const downloadRes = await fetch(data.url);
      const blob = await downloadRes.blob();
      saveAs(blob, name);
    } catch (e) {
      console.error("Download error:", e);
    }
  };

  const handleDownloadSelected = async () => {
    const files = items.filter((i) => selectedPaths.has(i.path) && i.type === "file");
    setIsDownloading(true);
    try {
      await Promise.all(
        files.map(async (file, i) => {
          await new Promise((r) => setTimeout(r, i * 200));
          await handleDownloadFile(file.path);
        })
      );
    } finally {
      setIsDownloading(false);
      clearSelection();
    }
  };

  // ─── Folder Visibility ────────────────────────────────────────────────────────
  const toggleFolderVisibility = async (folderPath: string) => {
    try {
      if (!db) return;
      const isHidden = hiddenFolders.includes(folderPath);
      const next = isHidden
        ? hiddenFolders.filter((p) => p !== folderPath)
        : [...hiddenFolders, folderPath];
      setHiddenFolders(next);
      await setDoc(doc(db, "settings", "fileManager"), { hiddenFolders: next }, { merge: true });
    } catch (e) {
      console.error("Error toggling visibility:", e);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const getPublicUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_DEV_URL || "";
    return `${base}/${path}`;
  };

  const formatSize = (bytes?: number) => {
    if (bytes === undefined) return "—";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };


  const images = displayedItems.filter(
    (i) => i.type === "file" && /\.(jpe?g|png|gif|webp|svg)$/i.test(i.name)
  );

  const isAnyCompressing = stagedFiles.some((f) => f.status === "compressing");
  const isAnyReady = stagedFiles.some((f) => f.status === "ready" || f.status === "error");
  const allSuccess = stagedFiles.length > 0 && stagedFiles.every((f) => f.status === "success");

  const handleSearchChange = (q: string) => {
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setSearchQuery(q), 200);
  };

  return {
    // State
    currentPrefix, items, displayedItems, images,
    loading, error, uploading, isDownloading,
    selectedPaths, hiddenFolders, showHidden, setShowHidden,
    stagedFiles, searchQuery, handleSearchChange,
    breadcrumbs, isAnyCompressing, isAnyReady, allSuccess,
    // Actions
    navigateToFolder, navigateUp, navigateTo,
    toggleSelection, toggleSelectAll, clearSelection,
    handleCreateFolder, handleRename, handleDeleteSelected,
    stageFiles, handleUploadAll, removeStagedFile, clearStagedFiles, retryUpload,
    handleDownloadFile, handleDownloadSelected,
    toggleFolderVisibility,
    getPublicUrl, formatSize,
    fetchItems,
  };
}
