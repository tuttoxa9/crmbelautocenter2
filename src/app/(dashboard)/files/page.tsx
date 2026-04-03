"use client";

import { useState, useEffect, useCallback } from "react";
import { Folder, File as FileIcon, Upload, Trash2, FolderPlus, Download, ChevronRight, CornerLeftUp, Image as ImageIcon, CheckSquare, Square, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useDropzone } from "react-dropzone";

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
    setUploading(true);

    try {
      const { auth } = await import('@/lib/firebase');
      const token = await auth?.currentUser?.getIdToken();

      const uploadPromises = acceptedFiles.map(file => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("prefix", currentPrefix);
        return fetch('/api/s3/upload', {
          method: 'POST',
          headers: {
             'Authorization': `Bearer ${token}`
          },
          body: formData,
        });
      });

      await Promise.all(uploadPromises);
      fetchItems(currentPrefix);
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setUploading(false);
    }
  }, [currentPrefix, fetchItems]);

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

  // Хлебные крошки
  const breadcrumbs = currentPrefix.split('/').filter(Boolean);

  return (
    <div className="flex flex-col h-full space-y-4" {...getRootProps()}>
        <input {...getInputProps()} />

        {isDragActive && (
            <div className="absolute inset-0 z-50 bg-blue-50/90 border-4 border-dashed border-blue-400 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                    <Upload className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-bounce" />
                    <p className="text-2xl font-bold text-blue-700">Отпустите файлы для загрузки</p>
                    <p className="text-blue-600 mt-2">Они будут загружены в текущую папку</p>
                </div>
            </div>
        )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">S3 Хранилище</h2>
          <p className="text-sm text-zinc-500 mt-1">Cloudflare R2 File Manager</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">

        {/* Breadcrumbs */}
        <div className="flex items-center space-x-1 text-sm font-medium text-zinc-600 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0">
          <button
            onClick={() => setCurrentPrefix("")}
            className="hover:text-zinc-900 hover:bg-zinc-100 p-1 rounded-md transition-colors flex items-center"
          >
             <Folder className="h-4 w-4 mr-1 text-zinc-400" /> Root
          </button>
          {breadcrumbs.map((part, index) => {
             const path = breadcrumbs.slice(0, index + 1).join('/') + '/';
             return (
               <div key={path} className="flex items-center">
                  <ChevronRight className="h-4 w-4 text-zinc-400 mx-1" />
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

        <div className="flex items-center gap-2">
           <div className="flex items-center">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Имя папки..."
                className="h-9 w-32 rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:border-zinc-300"
              />
              <Button onClick={handleCreateFolder} size="sm" variant="outline" className="h-9 rounded-l-none bg-zinc-50 hover:bg-zinc-100">
                <FolderPlus className="h-4 w-4" />
              </Button>
           </div>

           <label className="cursor-pointer">
              <div className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-all outline-none select-none bg-zinc-900 hover:bg-zinc-800 text-white h-9 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem]">
                 <Upload className="h-4 w-4 mr-2" />
                 Загрузить {uploading && "..."}
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
             <Button onClick={handleDeleteSelected} size="sm" variant="destructive" className="h-9">
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить ({selectedPaths.size})
             </Button>
           )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500">Загрузка...</div>
        ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 bg-zinc-50 border-b border-zinc-200 uppercase sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">
                       <button onClick={toggleAll} className="text-zinc-400 hover:text-zinc-700">
                         {items.length > 0 && selectedPaths.size === items.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                       </button>
                    </th>
                    <th className="px-4 py-3 font-medium">Имя</th>
                    <th className="px-4 py-3 font-medium w-32">Размер</th>
                    <th className="px-4 py-3 font-medium w-48">Изменен</th>
                    <th className="px-4 py-3 font-medium w-24 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {currentPrefix !== "" && (
                     <tr className="hover:bg-zinc-50/50 group">
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 cursor-pointer flex items-center gap-2" onClick={handleUpFolder}>
                           <CornerLeftUp className="h-5 w-5 text-zinc-400" />
                           <span className="font-medium text-zinc-700">..</span>
                        </td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                     </tr>
                  )}
                  {items.map((item) => {
                    const isSelected = selectedPaths.has(item.path);
                    const isImage = item.type === 'file' && /\.(jpe?g|png|gif|webp|svg)$/i.test(item.name);

                    return (
                      <tr key={item.path} className={`hover:bg-zinc-50 group transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-4 py-3 text-center">
                           <button onClick={() => toggleSelection(item.path)} className="text-zinc-400 hover:text-blue-600">
                             {isSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                           </button>
                        </td>
                        <td
                          className={`px-4 py-3 flex items-center gap-3 ${item.type === 'folder' ? 'cursor-pointer' : ''}`}
                          onClick={() => item.type === 'folder' && handleFolderClick(item)}
                        >
                          {item.type === 'folder' ? (
                            <Folder className="h-5 w-5 text-zinc-400 fill-zinc-100 group-hover:text-blue-500 transition-colors" />
                          ) : isImage ? (
                             <div className="h-6 w-6 rounded flex items-center justify-center bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={getPublicUrl(item.path)} alt={item.name} className="object-cover h-full w-full" loading="lazy" />
                             </div>
                          ) : (
                            <FileIcon className="h-5 w-5 text-zinc-400 shrink-0" />
                          )}
                          <span className={`font-medium truncate max-w-[200px] sm:max-w-md ${item.type === 'folder' ? 'text-zinc-900 group-hover:text-blue-600' : 'text-zinc-700'}`}>
                            {item.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                           {item.type === 'file' ? formatSize(item.size) : '—'}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                           {formatDate(item.lastModified)}
                        </td>
                        <td className="px-4 py-3 text-right">
                           {item.type === 'file' && (
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600" onClick={() => copyToClipboard(getPublicUrl(item.path))} title="Копировать ссылку">
                                    <Copy className="h-4 w-4" />
                                 </Button>
                                 <a href={getPublicUrl(item.path)} download target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-muted aria-expanded:bg-muted dark:hover:bg-muted/50 size-8 text-zinc-400 hover:text-zinc-900" title="Скачать">
                                    <Download className="h-4 w-4" />
                                 </a>
                              </div>
                           )}
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && currentPrefix === "" && !loading && (
                     <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                           <div className="flex flex-col items-center justify-center">
                              <Folder className="h-12 w-12 text-zinc-200 mb-3" />
                              <p className="text-base font-medium text-zinc-900">Хранилище пусто</p>
                              <p className="text-sm mt-1">Перетащите файлы сюда или используйте кнопку загрузки</p>
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
