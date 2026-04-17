"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

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

export function FileManager() {
  const fm = useFileManager();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [renameTarget, setRenameTarget] = useState<S3Object | null>(null);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<S3Object | null>(null);

  // ── Dropzone ────────────────────────────────────────────────────────────────
  const onDrop = useCallback(async (files: File[]) => {
    setUploadSheetOpen(true);
    await fm.stageFiles(files);
  }, [fm]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  // ── Lightbox helpers ────────────────────────────────────────────────────────
  const openLightbox = (path: string) => {
    const idx = fm.images.findIndex((img) => img.path === path);
    if (idx !== -1) setLightboxIndex(idx);
  };
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  const nextImage = () =>
    setLightboxIndex((i) =>
      i !== null && i < fm.images.length - 1 ? i + 1 : i
    );

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDeleteSingle = (item: S3Object) => {
    fm.clearSelection();
    fm.toggleSelection(item.path);
    setSingleDeleteTarget(item);
    setShowDeleteConfirm(true);
  };

  const handleDeleteSelected = () => setShowDeleteConfirm(true);

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    setSingleDeleteTarget(null);
    await fm.handleDeleteSelected();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    if (singleDeleteTarget) {
      fm.clearSelection();
      setSingleDeleteTarget(null);
    }
  };

  // ── Copy URL ────────────────────────────────────────────────────────────────
  const copyUrl = (url: string) => navigator.clipboard.writeText(url);

  // ── Upload helpers ──────────────────────────────────────────────────────────
  const handleManualUpload = async (files: File[]) => {
    setUploadSheetOpen(true);
    await fm.stageFiles(files);
  };

  const handleUploadAll = async () => {
    await fm.handleUploadAll();
    if (fm.allSuccess) {
      setTimeout(() => {
        setUploadSheetOpen(false);
        fm.clearStagedFiles();
      }, 1500);
    }
  };

  const deleteCount = singleDeleteTarget ? 1 : fm.selectedPaths.size;

  return (
    <div
      className="flex flex-col h-full p-3 md:p-5 gap-3 relative"
      {...getRootProps()}
    >
      <input {...getInputProps()} />

      {/* ── Drag overlay ──────────────────────────────────────────────────── */}
      {isDragActive && (
        <div className="absolute inset-0 z-[60] bg-indigo-50/90 border-4 border-dashed border-indigo-400 rounded-2xl flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4 animate-bounce">
            <Upload className="w-8 h-8 text-indigo-600" />
          </div>
          <p className="text-xl font-bold text-indigo-700">Отпустите файлы</p>
          <p className="text-sm text-indigo-500 mt-1">Они попадут в менеджер загрузок</p>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex-none">
        <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight mb-3">
          Файлы
        </h1>
        <FileToolbar
          breadcrumbs={fm.breadcrumbs}
          currentPrefix={fm.currentPrefix}
          showHidden={fm.showHidden}
          onToggleHidden={() => fm.setShowHidden(!fm.showHidden)}
          onNavigate={fm.navigateTo}
          onNavigateRoot={() => fm.navigateTo("")}
          onOpenCreateFolder={() => setShowCreateFolder(true)}
          onUpload={handleManualUpload}
          searchQuery={fm.searchQuery}
          onSearchChange={fm.handleSearchChange}
        />
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/70 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-3 md:p-4" style={{ WebkitOverflowScrolling: "touch" }}>
          {fm.loading ? (
            <FileSkeletons count={12} />
          ) : fm.error ? (
            <ErrorState
              message={fm.error}
              onRetry={() => fm.fetchItems(fm.currentPrefix)}
            />
          ) : fm.displayedItems.length === 0 ? (
            <EmptyState
              onDrop={handleManualUpload}
              isSubfolder={fm.currentPrefix !== ""}
            />
          ) : (
            <FileGrid
              items={fm.displayedItems}
              currentPrefix={fm.currentPrefix}
              selectedPaths={fm.selectedPaths}
              hiddenFolders={fm.hiddenFolders}
              onNavigateUp={fm.navigateUp}
              onFolderClick={fm.navigateToFolder}
              onToggleSelect={fm.toggleSelection}
              onOpenLightbox={openLightbox}
              onDownload={fm.handleDownloadFile}
              onCopyUrl={copyUrl}
              onToggleVisibility={fm.toggleFolderVisibility}
              onRename={setRenameTarget}
              onDelete={handleDeleteSingle}
              getPublicUrl={fm.getPublicUrl}
              formatSize={fm.formatSize}
            />
          )}
        </div>
      </div>

      {/* ── Floating Selection Bar ─────────────────────────────────────────── */}
      {fm.selectedPaths.size > 0 && (
        <SelectionBar
          count={fm.selectedPaths.size}
          onDownload={fm.handleDownloadSelected}
          onDelete={handleDeleteSelected}
          onClear={fm.clearSelection}
          isDownloading={fm.isDownloading}
        />
      )}

      {/* ── Upload Sheet ───────────────────────────────────────────────────── */}
      <UploadSheet
        isOpen={uploadSheetOpen}
        onClose={() => setUploadSheetOpen(false)}
        stagedFiles={fm.stagedFiles}
        onRemove={fm.removeStagedFile}
        onRetry={fm.retryUpload}
        onUploadAll={handleUploadAll}
        uploading={fm.uploading}
        isAnyCompressing={fm.isAnyCompressing}
        isAnyReady={fm.isAnyReady}
        allSuccess={fm.allSuccess}
        formatSize={fm.formatSize}
      />

      {/* ── Lightbox ───────────────────────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={fm.images}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
          onDownload={fm.handleDownloadFile}
          getPublicUrl={fm.getPublicUrl}
          formatSize={fm.formatSize}
        />
      )}

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <DeleteConfirmDialog
          count={deleteCount}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}

      {/* ── Create Folder ──────────────────────────────────────────────────── */}
      {showCreateFolder && (
        <CreateFolderDialog
          onConfirm={async (name) => {
            setShowCreateFolder(false);
            await fm.handleCreateFolder(name);
          }}
          onCancel={() => setShowCreateFolder(false)}
        />
      )}

      {/* ── Rename ─────────────────────────────────────────────────────────── */}
      {renameTarget && (
        <RenameDialog
          item={renameTarget}
          onConfirm={async (newName) => {
            const target = renameTarget;
            setRenameTarget(null);
            await fm.handleRename(target, newName);
          }}
          onCancel={() => setRenameTarget(null)}
        />
      )}
    </div>
  );
}
