"use client";

import { useState, useEffect, useCallback } from "react";
import { Folder, File as FileIcon, Upload, Trash2, FolderPlus, Download, ChevronRight, CornerLeftUp, Image as ImageIcon, CheckSquare, Square, Copy, EyeOff, Eye, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useDropzone } from "react-dropzone";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import imageCompression from "browser-image-compression";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface S3Object {
  name: string;
  path: string;
  type: "folder" | "file";
  size?: number;
  lastModified?: string;
}

export default function FilesPage() {
  const [currentPrefix, setCurrentPrefix] = useState<string>("");
  const [items, setItems] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState("");
  const [hiddenFolders, setHiddenFolders] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Upload Drawer state
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<{
    file: File;
    originalSize: number;
    compressedSize?: number;
    status: 'pending' | 'compressing' | 'ready' | 'uploading' | 'success' | 'error';
  }[]>([]);

  const fetchSettings = async () => {
    try {
      if (!db) return;
      const docRef = doc(db, "settings", "fileManager");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setHiddenFolders(docSnap.data().hiddenFolders || []);
      }
    } catch (error) {
      console.error("Error fetching hidden folders:", error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchItems = useCallback(async (prefix: string) => {
    setLoading(true);
    setSelectedPaths(new Set());
    try {
      const { auth } = await import('@/lib/firebase');
      const token = await auth?.currentUser?.getIdToken();
      if (!token) {
         console.warn("No token available for S3 list");
         // Мы не прерываем выполнение, чтобы показать пустой список, если нет доступа.
      }
      const res = await fetch(`/api/s3/list?prefix=${encodeURIComponent(prefix)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
         const data = await res.json();
         if (data.items) {
           setItems(data.items);
         }
      } else {
         console.error("Error fetching items, status:", res.status);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(currentPrefix);
  }, [currentPrefix, fetchItems]);

  const handleFolderClick = (folder: S3Object) => {
    setCurrentPrefix(folder.path);
  };

  const handleUpFolder = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    const newPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
    setCurrentPrefix(newPrefix);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const { auth } = await import('@/lib/firebase');
      const token = await auth?.currentUser?.getIdToken();
      await fetch('/api/s3/create-folder', {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prefix: currentPrefix, folderName: newFolderName.trim() })
      });
      setNewFolderName("");
      fetchItems(currentPrefix);
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPaths.size === 0) return;
    if (!confirm(`Удалить выбранные элементы (${selectedPaths.size})?`)) return;

    try {
      const { auth } = await import('@/lib/firebase');
      const token = await auth?.currentUser?.getIdToken();
      await fetch('/api/s3/delete', {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ keys: Array.from(selectedPaths) })
      });
      fetchItems(currentPrefix);
    } catch (error) {
      console.error("Error deleting items:", error);
    }
  };

  const toggleSelection = (path: string) => {
    const newSelected = new Set(selectedPaths);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedPaths(newSelected);
  };

  const toggleAll = () => {
    if (selectedPaths.size === items.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(items.map(i => i.path)));
    }
  };

  const formatSize = (bytes?: number) => {
    if (bytes === undefined) return "—";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return format(new Date(dateStr), "dd MMM yyyy, HH:mm", { locale: ru });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setIsUploadDrawerOpen(true);

    const newStagedFiles = acceptedFiles.map(file => ({
      file,
      originalSize: file.size,
      status: 'pending' as const
    }));

    setStagedFiles(prev => [...prev, ...newStagedFiles]);

    // Compress images automatically
    for (let i = 0; i < newStagedFiles.length; i++) {
      const item = newStagedFiles[i];
      if (item.file.type.startsWith('image/')) {
        setStagedFiles(prev => {
          const arr = [...prev];
          const idx = arr.findIndex(f => f.file === item.file);
          if (idx !== -1) arr[idx].status = 'compressing';
          return arr;
        });

        try {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          };
          const compressedFile = await imageCompression(item.file, options);

          setStagedFiles(prev => {
            const arr = [...prev];
            const idx = arr.findIndex(f => f.file === item.file);
            if (idx !== -1) {
               // Create a new File object with the original name to preserve it
               const renamedFile = new File([compressedFile], item.file.name, {
                 type: compressedFile.type,
               });
               arr[idx].file = renamedFile;
               arr[idx].compressedSize = compressedFile.size;
               arr[idx].status = 'ready';
            }
            return arr;
          });
        } catch (error) {
          console.error("Compression error:", error);
          setStagedFiles(prev => {
            const arr = [...prev];
            const idx = arr.findIndex(f => f.file === item.file);
            if (idx !== -1) arr[idx].status = 'ready'; // fallback to original
            return arr;
          });
        }
      } else {
        setStagedFiles(prev => {
          const arr = [...prev];
          const idx = arr.findIndex(f => f.file === item.file);
          if (idx !== -1) arr[idx].status = 'ready';
          return arr;
        });
      }
    }
  }, []);

  const handleUploadAll = async () => {
    setUploading(true);
    try {
      const { auth } = await import('@/lib/firebase');
      const token = await auth?.currentUser?.getIdToken();

      const filesToUpload = stagedFiles.filter(f => f.status === 'ready' || f.status === 'error');

      for (const item of filesToUpload) {
         setStagedFiles(prev => {
           const arr = [...prev];
           const idx = arr.findIndex(f => f.file === item.file);
           if (idx !== -1) arr[idx].status = 'uploading';
           return arr;
         });

         const formData = new FormData();
         formData.append("file", item.file);
         formData.append("prefix", currentPrefix);

         try {
           const res = await fetch('/api/s3/upload', {
             method: 'POST',
             headers: {
                'Authorization': `Bearer ${token}`
             },
             body: formData,
           });

           if (!res.ok) throw new Error("Upload failed");

           setStagedFiles(prev => {
             const arr = [...prev];
             const idx = arr.findIndex(f => f.file === item.file);
             if (idx !== -1) arr[idx].status = 'success';
             return arr;
           });
         } catch (error) {
           console.error(error);
           setStagedFiles(prev => {
             const arr = [...prev];
             const idx = arr.findIndex(f => f.file === item.file);
             if (idx !== -1) arr[idx].status = 'error';
             return arr;
           });
         }
      }

      await fetchItems(currentPrefix);

      // Close drawer if all success
      const updatedStaged = stagedFiles.filter(f => f.status !== 'success');
      if (updatedStaged.length === 0) {
         setTimeout(() => {
            setIsUploadDrawerOpen(false);
            setStagedFiles([]);
         }, 1000);
      }
    } catch (error) {
      console.error("Auth error during upload:", error);
    } finally {
      setUploading(false);
    }
  };

  const removeStagedFile = (fileToRemove: File) => {
     setStagedFiles(prev => prev.filter(f => f.file !== fileToRemove));
     if (stagedFiles.length === 1) {
        setIsUploadDrawerOpen(false);
     }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });

  const getPublicUrl = (path: string) => {
      // Это сработает, если переменная задана в браузере. Если нет, нужно прокидывать.
      const baseUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_DEV_URL || "";
      return `${baseUrl}/${path}`;
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      // Можно добавить toast
  };

  const handleDownloadFile = async (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const { auth } = await import('@/lib/firebase');
      const token = await auth?.currentUser?.getIdToken();
      if (!token) return;

      const url = `/api/s3/download?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`;
      window.location.href = url;
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const handleDownloadSelectedIndividual = async () => {
    if (selectedPaths.size === 0) return;
    const filesToDownload = items.filter(item => selectedPaths.has(item.path) && item.type === 'file');

    // We open each file download url with a slight delay
    for (const file of filesToDownload) {
      await handleDownloadFile(file.path);
      await new Promise(r => setTimeout(r, 500)); // Small delay to help browser process multiple downloads
    }
  };

  const handleDownloadSelectedZip = async () => {
    if (selectedPaths.size === 0) return;
    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();

      const filesToDownload = items.filter(item => selectedPaths.has(item.path) && item.type === 'file');

      if (filesToDownload.length === 0) {
         setIsDownloadingZip(false);
         return;
      }

      const promises = filesToDownload.map(async (file) => {
         try {
           const { auth } = await import('@/lib/firebase');
           const token = await auth?.currentUser?.getIdToken();
           if (!token) return;

           const res = await fetch(`/api/s3/download?path=${encodeURIComponent(file.path)}`, {
              headers: {
                 Authorization: `Bearer ${token}`
              }
           });

           if (!res.ok) throw new Error("Failed to get signed url");
           const data = await res.json();

           const downloadRes = await fetch(data.url);
           if (downloadRes.ok) {
              const blob = await downloadRes.blob();
              zip.file(file.name, blob);
           }
         } catch (e) {
            console.error(`Error adding ${file.name} to zip:`, e);
         }
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `archive_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.zip`);

    } catch (error) {
      console.error("Error creating zip:", error);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const toggleFolderVisibility = async (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!db) return;
      const isCurrentlyHidden = hiddenFolders.includes(folderPath);
      const newHiddenFolders = isCurrentlyHidden
        ? hiddenFolders.filter(p => p !== folderPath)
        : [...hiddenFolders, folderPath];

      setHiddenFolders(newHiddenFolders);

      const docRef = doc(db, "settings", "fileManager");
      await setDoc(docRef, { hiddenFolders: newHiddenFolders }, { merge: true });
    } catch (error) {
      console.error("Error toggling folder visibility:", error);
    }
  };

  // Хлебные крошки
  const breadcrumbs = currentPrefix.split('/').filter(Boolean);

  const displayedItems = items.filter(item => {
    if (item.type !== 'folder') return true;
    if (showHidden) return true;
    return !hiddenFolders.includes(item.path);
  });

  const imagesInCurrentFolder = displayedItems.filter(item => item.type === 'file' && /\.(jpe?g|png|gif|webp|svg)$/i.test(item.name));

  const openLightbox = (itemPath: string) => {
    const index = imagesInCurrentFolder.findIndex(img => img.path === itemPath);
    if (index !== -1) {
      setLightboxIndex(index);
    }
  };

  const closeLightbox = () => setLightboxIndex(null);

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && lightboxIndex < imagesInCurrentFolder.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
      if (e.key === 'ArrowRight' && lightboxIndex < imagesInCurrentFolder.length - 1) setLightboxIndex(lightboxIndex + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, imagesInCurrentFolder.length]);

  const isAnyCompressing = stagedFiles.some(f => f.status === 'compressing');
  const isAnyReady = stagedFiles.some(f => f.status === 'ready' || f.status === 'error');

  return (
    <div className="flex flex-col h-full space-y-4" {...getRootProps()}>
        <input {...getInputProps()} />

        {isDragActive && (
            <div className="absolute inset-0 z-[60] bg-blue-50/90 border-4 border-dashed border-blue-400 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                    <Upload className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-bounce" />
                    <p className="text-2xl font-bold text-blue-700">Отпустите файлы для загрузки</p>
                    <p className="text-blue-600 mt-2">Они будут добавлены в менеджер загрузок</p>
                </div>
            </div>
        )}

      {/* Upload Drawer */}
      <Sheet open={isUploadDrawerOpen} onOpenChange={setIsUploadDrawerOpen}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto flex flex-col h-full">
          <SheetHeader className="mb-4">
            <SheetTitle>Менеджер загрузок</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
             {stagedFiles.map((sf, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                   <div className="h-10 w-10 shrink-0 bg-white border border-zinc-200 rounded flex items-center justify-center overflow-hidden">
                      {sf.file.type.startsWith('image/') ? (
                         <img src={URL.createObjectURL(sf.file)} alt="preview" className="h-full w-full object-cover" />
                      ) : (
                         <FileIcon className="h-5 w-5 text-zinc-400" />
                      )}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{sf.file.name}</p>
                      <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                         {sf.status === 'compressing' ? (
                            <span className="text-blue-600">Сжимаем...</span>
                         ) : sf.compressedSize ? (
                            <>
                               <span className="line-through opacity-70">{formatSize(sf.originalSize)}</span>
                               <span>→</span>
                               <span className="text-green-600 font-medium">{formatSize(sf.compressedSize)}</span>
                            </>
                         ) : (
                            <span>{formatSize(sf.originalSize)}</span>
                         )}
                      </div>
                   </div>
                   <div className="shrink-0 flex items-center">
                      {sf.status === 'success' && <CheckSquare className="h-5 w-5 text-green-500" />}
                      {sf.status === 'error' && <span className="text-xs text-red-500">Ошибка</span>}
                      {sf.status === 'uploading' && <Spinner size="sm" />}
                      {(sf.status === 'ready' || sf.status === 'error' || sf.status === 'pending') && (
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-500" onClick={() => removeStagedFile(sf.file)}>
                            <Trash2 className="h-4 w-4" />
                         </Button>
                      )}
                   </div>
                </div>
             ))}
             {stagedFiles.length === 0 && (
                <div className="text-center text-zinc-500 py-10 text-sm">Нет файлов для загрузки</div>
             )}
          </div>

          <div className="pt-4 border-t border-zinc-200 mt-auto">
             <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleUploadAll}
                disabled={uploading || isAnyCompressing || !isAnyReady}
             >
                {uploading ? <Spinner size="sm" className="mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {uploading ? "Загрузка..." : isAnyCompressing ? "Идет сжатие..." : "Загрузить на сервер"}
             </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center" onClick={closeLightbox}>
          <div className="absolute top-4 right-4 flex gap-2">
             <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={(e) => handleDownloadFile(imagesInCurrentFolder[lightboxIndex].path, e)} title="Скачать">
               <Download className="h-5 w-5" />
             </Button>
             <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={closeLightbox}>
               <span className="text-xl leading-none">✕</span>
             </Button>
          </div>

          {lightboxIndex > 0 && (
            <Button variant="ghost" size="icon" className="absolute left-4 text-white hover:bg-white/20 h-12 w-12 rounded-full" onClick={prevImage}>
              <ChevronRight className="h-8 w-8 rotate-180" />
            </Button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getPublicUrl(imagesInCurrentFolder[lightboxIndex].path)}
            alt={imagesInCurrentFolder[lightboxIndex].name}
            className="max-h-[90vh] max-w-[90vw] object-contain select-none"
            onClick={e => e.stopPropagation()}
          />

          {lightboxIndex < imagesInCurrentFolder.length - 1 && (
            <Button variant="ghost" size="icon" className="absolute right-4 text-white hover:bg-white/20 h-12 w-12 rounded-full" onClick={nextImage}>
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-4 py-2 rounded-full">
            {lightboxIndex + 1} / {imagesInCurrentFolder.length} — {imagesInCurrentFolder[lightboxIndex].name}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">AWS S3</h2>
          <p className="text-sm text-zinc-500 mt-1">Файловый менеджер S3</p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-white p-3 rounded-xl border border-zinc-200 shadow-sm overflow-hidden">

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full xl:w-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHidden(!showHidden)}
            className={`text-xs h-8 shrink-0 ${showHidden ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500'}`}
          >
            {showHidden ? <Eye className="h-3.5 w-3.5 mr-1.5" /> : <EyeOff className="h-3.5 w-3.5 mr-1.5" />}
            <span className="hidden sm:inline">{showHidden ? "Скрытые папки (показаны)" : "Скрытые папки (скрыты)"}</span>
            <span className="sm:hidden">{showHidden ? "Скрытые (вкл)" : "Скрытые (выкл)"}</span>
          </Button>

          {/* Breadcrumbs */}
          <div className="flex items-center space-x-1 text-sm font-medium text-zinc-600 overflow-x-auto whitespace-nowrap w-full sm:w-auto sm:border-l border-zinc-200 sm:pl-3 pb-1 sm:pb-0 scrollbar-hide">
          <button
            onClick={() => setCurrentPrefix("")}
            className="hover:text-zinc-900 hover:bg-zinc-100 p-1 rounded-md transition-colors flex items-center shrink-0"
          >
             <Folder className="h-4 w-4 mr-1 text-zinc-400" /> Root
          </button>
            {breadcrumbs.map((part, index) => {
               const path = breadcrumbs.slice(0, index + 1).join('/') + '/';
               return (
                 <div key={path} className="flex items-center shrink-0">
                    <ChevronRight className="h-4 w-4 text-zinc-400 mx-1 shrink-0" />
                    <button
                      onClick={() => setCurrentPrefix(path)}
                      className="hover:text-zinc-900 hover:bg-zinc-100 p-1 rounded-md transition-colors"
                    >
                      {part}
                    </button>
                 </div>
               )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
           <div className="flex items-center mr-auto xl:mr-0">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Имя папки"
                className="h-9 w-24 sm:w-32 rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:border-zinc-300 text-sm"
              />
              <Button onClick={handleCreateFolder} size="sm" variant="outline" className="h-9 rounded-l-none bg-zinc-50 hover:bg-zinc-100 px-2 sm:px-3">
                <FolderPlus className="h-4 w-4" />
              </Button>
           </div>

           <label className="cursor-pointer shrink-0">
              <div className="inline-flex items-center justify-center rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-all outline-none select-none bg-zinc-900 hover:bg-zinc-800 text-white h-9 gap-1 rounded-[min(var(--radius-md),12px)] px-2 sm:px-3">
                 <Upload className="h-4 w-4 sm:mr-1.5" />
                 <span className="hidden sm:inline">Загрузить {uploading && "..."}</span>
              </div>
              <input
                 type="file"
                 multiple
                 className="hidden"
                 onChange={(e) => {
                    if (e.target.files) {
                        onDrop(Array.from(e.target.files));
                    }
                 }}
              />
           </label>

           {selectedPaths.size > 0 && (
             <div className="flex items-center gap-1.5 bg-blue-50/50 p-1 rounded-lg border border-blue-100 shrink-0">
               <Button onClick={handleDownloadSelectedIndividual} size="sm" variant="ghost" className="h-7 px-2 text-blue-700 hover:bg-blue-100" title="Скачать по отдельности">
                  <Download className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Скачать</span>
               </Button>
               <Button onClick={handleDownloadSelectedZip} size="sm" variant="ghost" className="h-7 px-2 text-blue-700 hover:bg-blue-100" disabled={isDownloadingZip} title="Скачать как ZIP">
                  {isDownloadingZip ? <Spinner size="sm" className="sm:mr-1.5" /> : <Archive className="h-4 w-4 sm:mr-1.5" />}
                  <span className="hidden sm:inline">ZIP</span>
               </Button>
               <Button onClick={handleDeleteSelected} size="sm" variant="ghost" className="h-7 px-2 text-red-600 hover:bg-red-100 hover:text-red-700" title="Удалить">
                  <Trash2 className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Удалить</span>
                  <span className="sm:hidden font-semibold ml-1">{selectedPaths.size}</span>
               </Button>
             </div>
           )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col min-h-0">
        {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 py-20">
               <Spinner size="lg" className="mb-4 text-zinc-400" />
               <p>Загрузка файлов...</p>
            </div>
        ) : (
            <div className="overflow-x-auto flex-1 relative">
              <table className="w-full text-sm text-left min-w-[300px]">
                <thead className="text-xs text-zinc-500 bg-zinc-50 border-b border-zinc-200 uppercase sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 w-8 sm:w-10 text-center">
                       <button onClick={toggleAll} className="text-zinc-400 hover:text-zinc-700">
                         {items.length > 0 && selectedPaths.size === items.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                       </button>
                    </th>
                    <th className="px-2 sm:px-4 py-3 font-medium">Имя</th>
                    <th className="px-4 py-3 font-medium w-24 hidden lg:table-cell">Размер</th>
                    <th className="px-4 py-3 font-medium w-40 hidden xl:table-cell">Изменен</th>
                    <th className="px-2 sm:px-4 py-3 font-medium w-16 sm:w-24 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {currentPrefix !== "" && (
                     <tr className="hover:bg-zinc-50/50 group">
                        <td className="px-2 sm:px-4 py-3"></td>
                        <td className="px-2 sm:px-4 py-3 cursor-pointer flex items-center gap-2" onClick={handleUpFolder}>
                           <CornerLeftUp className="h-5 w-5 text-zinc-400 shrink-0" />
                           <span className="font-medium text-zinc-700">..</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell"></td>
                        <td className="px-4 py-3 hidden xl:table-cell"></td>
                        <td className="px-2 sm:px-4 py-3"></td>
                     </tr>
                  )}
                  {displayedItems.map((item) => {
                    const isSelected = selectedPaths.has(item.path);
                    const isImage = item.type === 'file' && /\.(jpe?g|png|gif|webp|svg)$/i.test(item.name);
                    const isHidden = item.type === 'folder' && hiddenFolders.includes(item.path);

                    return (
                      <tr key={item.path} className={`hover:bg-zinc-50 group transition-colors ${isSelected ? 'bg-blue-50/30' : ''} ${isHidden ? 'opacity-50' : ''}`}>
                        <td className="px-2 sm:px-4 py-3 text-center">
                           <button onClick={() => toggleSelection(item.path)} className="text-zinc-400 hover:text-blue-600">
                             {isSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                           </button>
                        </td>
                        <td
                          className={`px-2 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 ${item.type === 'folder' ? 'cursor-pointer' : ''} max-w-[150px] sm:max-w-[200px] md:max-w-md`}
                          onClick={() => item.type === 'folder' && handleFolderClick(item)}
                        >
                          {item.type === 'folder' ? (
                            <Folder className="h-5 w-5 text-zinc-400 fill-zinc-100 group-hover:text-blue-500 transition-colors shrink-0" />
                          ) : isImage ? (
                             <div
                               className="h-6 w-6 rounded flex items-center justify-center bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200 cursor-pointer hover:ring-2 ring-blue-400 transition-all"
                               onClick={(e) => { e.stopPropagation(); openLightbox(item.path); }}
                             >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={getPublicUrl(item.path)} alt={item.name} className="object-cover h-full w-full" loading="lazy" />
                             </div>
                          ) : (
                            <FileIcon className="h-5 w-5 text-zinc-400 shrink-0" />
                          )}
                          <span className={`font-medium truncate ${item.type === 'folder' ? 'text-zinc-900 group-hover:text-blue-600' : 'text-zinc-700'}`} title={item.name}>
                            {item.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap hidden lg:table-cell text-xs sm:text-sm">
                           {item.type === 'file' ? formatSize(item.size) : '—'}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap hidden xl:table-cell text-xs sm:text-sm">
                           {formatDate(item.lastModified)}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                           <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                             {item.type === 'folder' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-zinc-400 hover:text-blue-600 bg-zinc-100 sm:bg-transparent"
                                  onClick={(e) => toggleFolderVisibility(item.path, e)}
                                  title={isHidden ? "Показывать папку" : "Скрыть папку"}
                                >
                                  {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </Button>
                             )}
                             {item.type === 'file' && (
                                <>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600 bg-zinc-100 sm:bg-transparent hidden sm:inline-flex" onClick={() => copyToClipboard(getPublicUrl(item.path))} title="Копировать ссылку">
                                      <Copy className="h-4 w-4" />
                                   </Button>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 bg-zinc-100 sm:bg-transparent" onClick={(e) => handleDownloadFile(item.path, e)} title="Скачать">
                                      <Download className="h-4 w-4" />
                                   </Button>
                                </>
                             )}
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                  {displayedItems.length === 0 && currentPrefix === "" && !loading && (
                     <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                           <div className="flex flex-col items-center justify-center">
                              <Folder className="h-12 w-12 text-zinc-200 mb-3" />
                              <p className="text-base font-medium text-zinc-900">Хранилище пусто</p>
                              <p className="text-sm mt-1 px-4 text-center">Перетащите файлы сюда или используйте кнопку загрузки</p>
                           </div>
                        </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
        )}
      </div>
    </div>
  );
}
