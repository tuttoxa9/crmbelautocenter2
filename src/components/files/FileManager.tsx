"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { useFileManager, S3Object } from "./useFileManager";
import { FileToolbar } from "./FileToolbar";
import { FileGrid } from "./FileGrid";
import { FileSkeletons } from "./FileSkeletons";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { SelectionBar } from "./SelectionBar";
import { UploadSheet } from "./UploadSheet";
import { ImageLightbox } from "./ImageLightbox";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { RenameDialog } from "./RenameDialog";
import { VideoCompressorSheet } from "./VideoCompressorSheet";
import { FilesScroller, FilesToast } from "./chrome";
import { fileLabel, isImageName, isVideoName, ruCount } from "@/lib/files/displayName";

export function FileManager() {
  const fm = useFileManager();
  const fmRef = useRef(fm);
  fmRef.current = fm;
  const filePickerRef = useRef<HTMLInputElement>(null);

  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [uploadDock, setUploadDock] = useState(false);
  const [videoCompressorOpen, setVideoCompressorOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [videoTarget, setVideoTarget] = useState<S3Object | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [renameTarget, setRenameTarget] = useState<S3Object | null>(null);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<S3Object | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "error" } | null>(null);
  const toastTimer = useRef<number>(0);

  const notify = useCallback((text: string, kind: "ok" | "error" = "ok") => {
    setToast({ text, kind });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const stageFiles = fm.stageFiles;
  const onDrop = useCallback(
    async (files: File[]) => {
      setUploadSheetOpen(true);
      setUploadDock(false);
      await stageFiles(files);
    },
    [stageFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });

  const openFile = useCallback(
    (item: S3Object) => {
      const state = fmRef.current;
      if (isImageName(item.name)) {
        const idx = state.images.findIndex((img) => img.path === item.path);
        if (idx !== -1) setLightboxIndex(idx);
        return;
      }
      if (isVideoName(item.name)) {
        setVideoTarget(item);
        return;
      }
      void state.handleDownloadFile(item.path).then((r) => {
        if (!r.ok) notify(r.error, "error");
      });
    },
    [notify],
  );

  const handleDeleteSingle = (item: S3Object) => {
    fm.clearSelection();
    fm.toggleSelection(item.path);
    setSingleDeleteTarget(item);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    setSingleDeleteTarget(null);
    const r = await fm.handleDeleteSelected();
    if (r.ok) notify("Удалено");
    else notify(r.error, "error");
    setSelectMode(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    if (singleDeleteTarget) {
      fm.clearSelection();
      setSingleDeleteTarget(null);
    }
  };

  const handleManualUpload = async (files: File[]) => {
    setUploadSheetOpen(true);
    setUploadDock(false);
    await fm.stageFiles(files);
  };

  const handleUploadAll = async () => {
    const r = await fm.handleUploadAll();
    if (!r.ok) notify(r.error, "error");
  };

  const copyUrl = (url: string) => {
    if (!url) {
      notify("Ссылки нет — скачайте файл", "error");
      return;
    }
    void navigator.clipboard.writeText(url);
    notify("Ссылка скопирована");
  };

  const overlayOpen =
    lightboxIndex !== null ||
    !!videoTarget ||
    showDeleteConfirm ||
    showCreateFolder ||
    !!renameTarget ||
    uploadSheetOpen ||
    videoCompressorOpen;

  const deleteCount = singleDeleteTarget ? 1 : fm.selectedPaths.size;
  const deleteKeys = singleDeleteTarget ? [singleDeleteTarget.path] : Array.from(fm.selectedPaths);
  const smmWarning = deleteKeys.some((k) => k.startsWith("videos/smm/"));
  const folderDelete = deleteKeys.some((k) => k.endsWith("/") || fm.items.find((i) => i.path === k)?.type === "folder");
  const deleteTitle = singleDeleteTarget
    ? singleDeleteTarget.type === "folder"
      ? `Удалить папку «${fileLabel(singleDeleteTarget.name)}»?`
      : `Удалить «${fileLabel(singleDeleteTarget.name)}»?`
    : `Удалить ${ruCount(deleteCount, "объект", "объекта", "объектов")}?`;
  const deleteDescription = folderDelete
    ? "Папка и всё содержимое исчезнут. Отменить нельзя."
    : "Это действие нельзя отменить.";

  const emptyKind = fm.searchQuery
    ? "search"
    : fm.typeFilter !== "all"
      ? "filter"
      : fm.hiddenCount > 0 && fm.displayedItems.length === 0 && fm.items.length > 0
        ? "hidden"
        : "folder";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const state = fmRef.current;

      if (e.key === "Escape") {
        if (lightboxIndex !== null) {
          setLightboxIndex(null);
          return;
        }
        if (videoTarget) {
          setVideoTarget(null);
          return;
        }
        if (overlayOpen) return;
        state.clearSelection();
        setSelectMode(false);
        return;
      }

      if (overlayOpen) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        state.toggleSelectAll();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && state.selectedPaths.size > 0) {
        e.preventDefault();
        setShowDeleteConfirm(true);
      }
      if (e.key === "Enter" && state.selectedPaths.size === 1) {
        const item = state.displayedItems.find((i) => state.selectedPaths.has(i.path));
        if (!item) return;
        if (item.type === "folder") state.navigateToFolder(item);
        else openFile(item);
      }
      if (e.key === " " && state.selectedPaths.size === 1) {
        const item = state.displayedItems.find((i) => state.selectedPaths.has(i.path));
        if (item && isImageName(item.name)) {
          e.preventDefault();
          openFile(item);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, videoTarget, overlayOpen, openFile]);

  useEffect(() => {
    if (fm.selectedPaths.size === 0) setSelectMode(false);
  }, [fm.selectedPaths.size]);

  const handleSelect = (path: string, opts?: { shift?: boolean; meta?: boolean }) => {
    if (opts?.shift) fm.selectRange(path, true);
    else fm.toggleSelection(path);
  };

  return (
    <div className="files-os relative flex h-full min-h-0 flex-col overflow-hidden" {...getRootProps()}>
      <input {...getInputProps()} />
      <input
        ref={filePickerRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleManualUpload(Array.from(e.target.files));
          e.target.value = "";
        }}
      />

      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm ring-2 ring-inset ring-white/30">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-white/10">
            <Upload className="size-7 text-white" />
          </div>
          <p className="text-lg font-semibold text-white">Отпустите в эту папку</p>
        </div>
      )}

      <FileToolbar
        breadcrumbs={fm.breadcrumbs}
        currentPrefix={fm.currentPrefix}
        showHidden={fm.showHidden}
        hiddenCount={fm.hiddenCount}
        onToggleHidden={() => fm.setShowHidden(!fm.showHidden)}
        onNavigate={fm.navigateTo}
        onNavigateRoot={() => fm.navigateTo("")}
        onOpenCreateFolder={() => setShowCreateFolder(true)}
        onUpload={handleManualUpload}
        onOpenVideoCompressor={() => setVideoCompressorOpen(true)}
        onCameraCapture={handleManualUpload}
        searchQuery={fm.searchQuery}
        onSearchChange={fm.handleSearchChange}
        viewMode={fm.viewMode}
        onViewMode={fm.setViewMode}
        sortMode={fm.sortMode}
        onSortMode={fm.setSortMode}
        typeFilter={fm.typeFilter}
        onTypeFilter={fm.setTypeFilter}
        itemCount={fm.displayedItems.length}
      />

      {fm.truncated ? (
        <p className="px-4 pb-1 text-[11px] text-files-subtle">Показана часть списка — в папке ещё есть файлы.</p>
      ) : null}

      <FilesScroller className="min-h-0 flex-1" contentClassName="min-h-full">
        {fm.loading && fm.displayedItems.length === 0 ? (
          <FileSkeletons />
        ) : fm.error ? (
          <ErrorState message={fm.error} onRetry={() => fm.fetchItems(fm.currentPrefix)} />
        ) : fm.displayedItems.length === 0 ? (
          <EmptyState
            kind={emptyKind}
            query={fm.searchQuery}
            typeFilter={fm.typeFilter}
            onUpload={() => filePickerRef.current?.click()}
            onCreateFolder={() => setShowCreateFolder(true)}
            onShowHidden={() => fm.setShowHidden(true)}
            onClearSearch={() => fm.handleSearchChange("")}
            onResetFilter={() => fm.setTypeFilter("all")}
          />
        ) : (
          <FileGrid
            items={fm.displayedItems}
            viewMode={fm.viewMode}
            sortMode={fm.sortMode}
            groupByDate={fm.groupByDate}
            selectMode={selectMode}
            selectedPaths={fm.selectedPaths}
            hiddenFolders={fm.hiddenFolders}
            onToggleSelect={handleSelect}
            onOpenFolder={fm.navigateToFolder}
            onOpenFile={openFile}
            onDownload={(path) => {
              void fm.handleDownloadFile(path).then((r) => {
                if (!r.ok) notify(r.error, "error");
              });
            }}
            onCopyUrl={copyUrl}
            onToggleVisibility={(path) => {
              void fm.toggleFolderVisibility(path).then((r) => {
                if (!r.ok) notify(r.error, "error");
                else notify("Спрячется у всех");
              });
            }}
            onRename={setRenameTarget}
            onDelete={handleDeleteSingle}
            onEnterSelectMode={(item) => {
              setSelectMode(true);
              if (!fm.selectedPaths.has(item.path)) fm.toggleSelection(item.path);
            }}
            getPublicUrl={fm.getPublicUrl}
            formatSize={fm.formatSize}
          />
        )}
      </FilesScroller>

      {fm.selectedPaths.size > 0 && (
        <SelectionBar
          count={fm.selectedPaths.size}
          onDownload={() => {
            void fm.handleDownloadSelected().then((r) => {
              if (!r.ok) notify(r.error, "error");
              else if (r.warning) notify(r.warning);
            });
          }}
          onDelete={() => setShowDeleteConfirm(true)}
          onClear={() => {
            fm.clearSelection();
            setSelectMode(false);
          }}
          onSelectAll={fm.toggleSelectAll}
          isDownloading={fm.isDownloading}
          downloadLabel={
            fm.downloadProgress ? `${fm.downloadProgress.done} из ${fm.downloadProgress.total}` : "Скачать"
          }
        />
      )}

      {uploadDock && fm.uploading && !uploadSheetOpen && (
        <button
          type="button"
          onClick={() => {
            setUploadSheetOpen(true);
            setUploadDock(false);
          }}
          className="fixed right-4 bottom-[max(5rem,env(safe-area-inset-bottom))] z-[70] rounded-full bg-files-ink px-4 py-2.5 text-xs font-semibold text-files-bg shadow-xl"
        >
          Загрузка {fm.stagedFiles.filter((f) => f.status === "success").length} из {fm.stagedFiles.length}
        </button>
      )}

      <UploadSheet
        isOpen={uploadSheetOpen}
        onClose={() => {
          setUploadSheetOpen(false);
          if (fm.uploading) setUploadDock(true);
          if (fm.allSuccess) fm.clearStagedFiles();
        }}
        stagedFiles={fm.stagedFiles}
        onRemove={fm.removeStagedFile}
        onRetry={fm.retryUpload}
        onUploadAll={() => void handleUploadAll()}
        onAddMore={(files) => void fm.stageFiles(files)}
        uploading={fm.uploading}
        isAnyCompressing={fm.isAnyCompressing}
        isAnyReady={fm.isAnyReady}
        allSuccess={fm.allSuccess}
        formatSize={fm.formatSize}
        compressImages={fm.compressImages}
        onToggleCompress={fm.setCompressImages}
      />

      <VideoCompressorSheet
        isOpen={videoCompressorOpen}
        onClose={() => setVideoCompressorOpen(false)}
        currentPrefix={fm.currentPrefix}
        onUploadSuccess={() => {
          void fm.fetchItems(fm.currentPrefix, { silent: true });
        }}
      />

      {lightboxIndex !== null && (
        <ImageLightbox
          images={fm.images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onJump={setLightboxIndex}
          onDownload={(path) => {
            void fm.handleDownloadFile(path).then((r) => {
              if (!r.ok) notify(r.error, "error");
            });
          }}
          getPublicUrl={fm.getPublicUrl}
          formatSize={fm.formatSize}
        />
      )}

      {videoTarget && (
        <VideoOverlay
          item={videoTarget}
          url={fm.getPublicUrl(videoTarget.path)}
          onClose={() => setVideoTarget(null)}
          onDownload={() => {
            void fm.handleDownloadFile(videoTarget.path).then((r) => {
              if (!r.ok) notify(r.error, "error");
            });
          }}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmDialog
          count={deleteCount}
          title={deleteTitle}
          description={deleteDescription}
          smmWarning={smmWarning}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={handleCancelDelete}
        />
      )}

      {showCreateFolder && (
        <CreateFolderDialog
          onConfirm={async (name) => {
            setShowCreateFolder(false);
            const r = await fm.handleCreateFolder(name);
            if (r.ok) notify(`Папка «${name}» создана`);
            else notify(r.error, "error");
          }}
          onCancel={() => setShowCreateFolder(false)}
        />
      )}

      {renameTarget && (
        <RenameDialog
          item={renameTarget}
          onConfirm={async (newName) => {
            const t = renameTarget;
            setRenameTarget(null);
            const r = await fm.handleRename(t, newName);
            if (r.ok) notify(r.warning || "Переименовано");
            else notify(r.error, "error");
          }}
          onCancel={() => setRenameTarget(null)}
        />
      )}

      {toast && <FilesToast text={toast.text} kind={toast.kind} />}
    </div>
  );
}

function VideoOverlay({
  item,
  url,
  onClose,
  onDownload,
}: {
  item: S3Object;
  url: string;
  onClose: () => void;
  onDownload: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-4">
        <button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-xl text-white/70 hover:bg-white/10">
          <X className="size-5" />
        </button>
        <p className="min-w-0 flex-1 truncate px-3 text-sm font-medium text-white">{fileLabel(item.name)}</p>
        <button type="button" onClick={onDownload} className="rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10">
          Скачать
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {url ? (
          <video src={url} controls autoPlay className="max-h-full max-w-full rounded-xl" />
        ) : (
          <p className="text-sm text-white/60">Нет ссылки для просмотра — скачайте файл</p>
        )}
      </div>
    </div>
  );
}
