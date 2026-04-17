"use client";

import { CornerLeftUp } from "lucide-react";
import { S3Object } from "./useFileManager";
import { FolderCard, FileCard } from "./FileCard";

interface FileGridProps {
  items: S3Object[];
  currentPrefix: string;
  selectedPaths: Set<string>;
  hiddenFolders: string[];
  onNavigateUp: () => void;
  onFolderClick: (item: S3Object) => void;
  onToggleSelect: (path: string) => void;
  onOpenLightbox: (path: string) => void;
  onDownload: (path: string) => void;
  onCopyUrl: (url: string) => void;
  onToggleVisibility: (path: string) => void;
  onRename: (item: S3Object) => void;
  onDelete: (item: S3Object) => void;
  getPublicUrl: (path: string) => string;
  formatSize: (bytes?: number) => string;
}

export function FileGrid({
  items, currentPrefix, selectedPaths, hiddenFolders,
  onNavigateUp, onFolderClick, onToggleSelect, onOpenLightbox,
  onDownload, onCopyUrl, onToggleVisibility, onRename, onDelete,
  getPublicUrl, formatSize,
}: FileGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 pb-24">
      {/* Navigate Up */}
      {currentPrefix !== "" && (
        <div
          onClick={onNavigateUp}
          className="group flex flex-col items-center p-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] hover:border-white/[0.14] hover:bg-white/[0.08] transition-all cursor-pointer active:scale-[0.95] select-none"
        >
          <div className="w-full aspect-square flex items-center justify-center mb-2 rounded-xl bg-white/[0.04]">
            <CornerLeftUp className="w-8 h-8 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
          </div>
          <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-400">..</span>
        </div>
      )}

      {/* Items */}
      {items.map((item) => {
        const isSelected = selectedPaths.has(item.path);
        const isHidden = item.type === "folder" && hiddenFolders.includes(item.path);

        if (item.type === "folder") {
          return (
            <FolderCard
              key={item.path}
              item={item}
              isSelected={isSelected}
              isHidden={isHidden}
              onSelect={() => onToggleSelect(item.path)}
              onClick={() => onFolderClick(item)}
              onToggleVisibility={() => onToggleVisibility(item.path)}
              onRename={() => onRename(item)}
              onDelete={() => onDelete(item)}
            />
          );
        }

        return (
          <FileCard
            key={item.path}
            item={item}
            isSelected={isSelected}
            onSelect={() => onToggleSelect(item.path)}
            onOpenLightbox={() => onOpenLightbox(item.path)}
            onDownload={() => onDownload(item.path)}
            onCopyUrl={() => onCopyUrl(getPublicUrl(item.path))}
            onRename={() => onRename(item)}
            onDelete={() => onDelete(item)}
            publicUrl={getPublicUrl(item.path)}
            formatSize={formatSize}
          />
        );
      })}
    </div>
  );
}
