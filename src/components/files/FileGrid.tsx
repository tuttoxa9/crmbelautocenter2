"use client";

import { CornerLeftUp } from "lucide-react";
import { S3Object } from "./useFileManager";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
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


const testItems: any[] = [
    { name: 'test-doc1.pdf', path: 'test-doc1.pdf', type: 'file', lastModified: '2026-07-13T10:00:00Z', size: 1024 },
    { name: 'test-folder1', path: 'test-folder1/', type: 'folder', lastModified: '2026-07-13T11:00:00Z' },
    { name: 'test-folder2', path: 'test-folder2/', type: 'folder', lastModified: '2026-07-12T10:00:00Z' },
    { name: 'test-doc2.txt', path: 'test-doc2.txt', type: 'file', lastModified: '2026-07-11T10:00:00Z', size: 2048 },
];

export function FileGrid({
  items, currentPrefix, selectedPaths, hiddenFolders,
  onNavigateUp, onFolderClick, onToggleSelect, onOpenLightbox,
  onDownload, onCopyUrl, onToggleVisibility, onRename, onDelete,
  getPublicUrl, formatSize,
}: FileGridProps) {

  // Group items by date
  const groupedItems = (items.length === 0 ? testItems : items).reduce((acc, item) => {
    let dateStr = "Неизвестная дата";
    if (item.lastModified) {
      try {
        const date = new Date(item.lastModified);
        dateStr = format(date, "d MMMM yyyy", { locale: ru });
      } catch {
        // Fallback
      }
    }

    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  // Sort dates descending
  const sortedDates = Object.keys(groupedItems).sort((a, b) => {
    if (a === "Неизвестная дата") return 1;
    if (b === "Неизвестная дата") return -1;

    // Attempt to parse back dates for sorting or just rely on items having lastModified
    const dateA = groupedItems[a][0]?.lastModified ? new Date(groupedItems[a][0].lastModified).getTime() : 0;
    const dateB = groupedItems[b][0]?.lastModified ? new Date(groupedItems[b][0].lastModified).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="pb-24">

      {/* Navigate Up */}
      {currentPrefix !== "" && (
        <div className="col-span-full mb-4">
          <div
            onClick={onNavigateUp}
            className="group inline-flex flex-col items-center p-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] hover:border-white/[0.14] hover:bg-white/[0.08] transition-all cursor-pointer active:scale-[0.95] select-none"
          >
            <div className="w-12 h-12 flex items-center justify-center mb-2 rounded-xl bg-white/[0.04]">
              <CornerLeftUp className="w-6 h-6 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
            </div>
            <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-400">Назад</span>
          </div>
        </div>
      )}

      {/* Grouped Items */}
      <div className="col-span-full flex flex-col gap-8">
        {sortedDates.map((dateStr) => (
          <div key={dateStr} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-zinc-400 pl-2">{dateStr}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {groupedItems[dateStr].map((item) => {
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
          </div>
        ))}
      </div>

    </div>
  );
}
