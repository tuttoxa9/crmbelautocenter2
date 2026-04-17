"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, HardDrive } from "lucide-react";

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
    setLightboxIndex((i) => (i !== null && i < fm.images.length - 1 ? i + 1 : i));

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
    if (singleDeleteTarget) { fm.clearSelection(); setSingleDeleteTarget(null); }
  };

  // ── Upload helpers ──────────────────────────────────────────────────────────
  const copyUrl = (url: string) => navigator.clipboard.writeText(url);
  const handleManualUpload = async (files: File[]) => {
    setUploadSheetOpen(true);
    await fm.stageFiles(files);
  };
  const handleUploadAll = async () => {
    await fm.handleUploadAll();
    if (fm.allSuccess) {
      setTimeout(() => { setUploadSheetOpen(false); fm.clearStagedFiles(); }, 1500);
    }
  };

  const deleteCount = singleDeleteTarget ? 1 : fm.selectedPaths.size;

  return (
    // Root: fills the black bg-black parent, sets its own dark surface
    <div
      className="flex flex-col h-full bg-[#111113] relative overflow-hidden"
      {...getRootProps()}
    >
      <input {...getInputProps()} />

      {/* ── Drag overlay ─────────────────────────────────────────────────── */}
      {isDragActive && (
        <div className="absolute inset-0 z-[60] bg-indigo-950/80 border-2 border-dashed border-indigo-400 rounded-none flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
          <div className="w-20 h-20 rounded-3xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center mb-5">
            <Upload className="w-10 h-10 text-indigo-300 animate-bounce" />
          </div>
          <p className="text-2xl font-bold text-white">Отпустите файлы</p>
          <p className="text-sm text-indigo-300 mt-2">Они попадут в менеджер загрузок</p>
        </div>
      )}

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex-none px-5 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Файлы</h1>
        </div>
        <p className="text-xs text-zinc-500 ml-11">Облачное хранилище · S3</p>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex-none px-4 pt-3 pb-2">
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

      {/* ── File grid area ───────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-6 min-h-0"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {fm.loading ? (
          <FileSkeletons count={12} />
        ) : fm.error ? (
          <ErrorState message={fm.error} onRetry={() => fm.fetchItems(fm.currentPrefix)} />
        ) : fm.displayedItems.length === 0 ? (
          <EmptyState onDrop={handleManualUpload} isSubfolder={fm.currentPrefix !== ""} />
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

      {/* ── Floating Selection Bar ───────────────────────────────────────── */}
      {fm.selectedPaths.size > 0 && (
        <SelectionBar
          count={fm.selectedPaths.size}
          onDownload={fm.handleDownloadSelected}
          onDelete={handleDeleteSelected}
          onClear={fm.clearSelection}
          isDownloading={fm.isDownloading}
        />
      )}

      {/* ── Overlays & Dialogs ───────────────────────────────────────────── */}
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

      {showDeleteConfirm && (
        <DeleteConfirmDialog count={deleteCount} onConfirm={handleConfirmDelete} onCancel={handleCancelDelete} />
      )}

      {showCreateFolder && (
        <CreateFolderDialog
          onConfirm={async (name) => { setShowCreateFolder(false); await fm.handleCreateFolder(name); }}
          onCancel={() => setShowCreateFolder(false)}
        />
      )}

      {renameTarget && (
        <RenameDialog
          item={renameTarget}
          onConfirm={async (newName) => { const t = renameTarget; setRenameTarget(null); await fm.handleRename(t, newName); }}
          onCancel={() => setRenameTarget(null)}
        />
      )}
    </div>
  );
}
