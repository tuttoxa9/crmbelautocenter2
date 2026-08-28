"use client";

import { useState } from "react";
import { format, isSameYear, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";
import type { S3Object, SortMode, ViewMode } from "./useFileManager";
import { FileCard, FileRow, FolderCard, FolderGlyph, getFileIcon } from "./FileCard";
import { fileLabel, isImageName } from "@/lib/files/displayName";
import { cn } from "@/lib/utils";

interface FileGridProps {
  items: S3Object[];
  viewMode: ViewMode;
  sortMode: SortMode;
  groupByDate: boolean;
  selectMode: boolean;
  selectedPaths: Set<string>;
  hiddenFolders: string[];
  onToggleSelect: (path: string, opts?: { shift?: boolean; meta?: boolean }) => void;
  onOpenFolder: (item: S3Object) => void;
  onOpenFile: (item: S3Object) => void;
  onDownload: (path: string) => void;
  onCopyUrl: (url: string) => void;
  onToggleVisibility: (path: string) => void;
  onRename: (item: S3Object) => void;
  onDelete: (item: S3Object) => void;
  onEnterSelectMode: (item: S3Object) => void;
  getPublicUrl: (path: string) => string;
  formatSize: (bytes?: number) => string;
}

function dateLabel(iso?: string) {
  if (!iso) return "Без даты";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Без даты";
  if (isToday(d)) return "Сегодня";
  if (isYesterday(d)) return "Вчера";
  return isSameYear(d, new Date())
    ? format(d, "d MMMM", { locale: ru })
    : format(d, "d MMMM yyyy", { locale: ru });
}

export function FileGrid(props: FileGridProps) {
  const { items, viewMode, sortMode, groupByDate } = props;
  const useGroups = viewMode === "grid" && sortMode === "date" && groupByDate;

  const sections: { key: string; items: S3Object[] }[] = [];
  if (useGroups) {
    const folders = items.filter((i) => i.type === "folder");
    const files = items.filter((i) => i.type !== "folder");
    if (folders.length) sections.push({ key: "Папки", items: folders });
    const byDate: Record<string, S3Object[]> = {};
    const order: string[] = [];
    for (const item of files) {
      const key = dateLabel(item.lastModified);
      if (!byDate[key]) {
        byDate[key] = [];
        order.push(key);
      }
      byDate[key].push(item);
    }
    const dated = order.filter((k) => k !== "Без даты");
    if (byDate["Без даты"]) dated.push("Без даты");
    for (const k of dated) sections.push({ key: k, items: byDate[k] });
  } else {
    sections.push({ key: "", items });
  }

  return (
    <div className="px-3 pb-28 sm:px-4">
      {sections.map((section) => (
        <div key={section.key || "all"} className="mb-7">
          {section.key ? <h2 className="mb-3 px-1 text-sm font-medium text-files-muted">{section.key}</h2> : null}
          {viewMode === "list" ? (
            <div className="divide-y divide-white/6 rounded-2xl bg-white/[0.03] ring-1 ring-white/6">
              {section.items.map((item) => (
                <RowItem key={item.path} item={item} props={props} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {section.items.map((item) =>
                item.type === "folder" ? (
                  <FolderCard
                    key={item.path}
                    item={item}
                    isSelected={props.selectedPaths.has(item.path)}
                    isHidden={props.hiddenFolders.includes(item.path)}
                    selectMode={props.selectMode}
                    onSelect={(e) => props.onToggleSelect(item.path, e)}
                    onOpen={() => props.onOpenFolder(item)}
                    onToggleVisibility={() => props.onToggleVisibility(item.path)}
                    onRename={() => props.onRename(item)}
                    onDelete={() => props.onDelete(item)}
                    onEnterSelectMode={() => props.onEnterSelectMode(item)}
                  />
                ) : (
                  <FileCard
                    key={item.path}
                    item={item}
                    isSelected={props.selectedPaths.has(item.path)}
                    selectMode={props.selectMode}
                    onSelect={(e) => props.onToggleSelect(item.path, e)}
                    onOpen={() => props.onOpenFile(item)}
                    onDownload={() => props.onDownload(item.path)}
                    onCopyUrl={() => props.onCopyUrl(props.getPublicUrl(item.path))}
                    onRename={() => props.onRename(item)}
                    onDelete={() => props.onDelete(item)}
                    onEnterSelectMode={() => props.onEnterSelectMode(item)}
                    publicUrl={props.getPublicUrl(item.path)}
                    formatSize={props.formatSize}
                    canCopyUrl={Boolean(props.getPublicUrl(item.path))}
                  />
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RowItem({ item, props }: { item: S3Object; props: FileGridProps }) {
  const [sheet, setSheet] = useState(false);
  const url = props.getPublicUrl(item.path);
  const img = item.type === "file" && isImageName(item.name) && url;
  const { Icon, color } = getFileIcon(item.name);
  const when = item.lastModified
    ? format(new Date(item.lastModified), "d MMM yyyy", { locale: ru })
    : "";
  const sub =
    item.type === "folder"
      ? props.hiddenFolders.includes(item.path)
        ? "Папка · скрыта"
        : "Папка"
      : [props.formatSize(item.size), when].filter(Boolean).join(" · ");

  return (
    <>
      <FileRow
        item={item}
        isSelected={props.selectedPaths.has(item.path)}
        isHidden={item.type === "folder" && props.hiddenFolders.includes(item.path)}
        selectMode={props.selectMode}
        subtitle={sub}
        onSelect={() => props.onToggleSelect(item.path)}
        onOpen={() => (item.type === "folder" ? props.onOpenFolder(item) : props.onOpenFile(item))}
        onMenu={() => setSheet(true)}
        onEnterSelectMode={() => props.onEnterSelectMode(item)}
        preview={
          img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : item.type === "folder" ? (
            <div className="flex h-full items-center justify-center bg-amber-500/10">
              <FolderGlyph className="h-5 w-6 text-files-folder" />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Icon className={cn("size-5", color)} />
            </div>
          )
        }
      />
      {sheet ? <ListActions item={item} props={props} onClose={() => setSheet(false)} /> : null}
    </>
  );
}

function ListActions({
  item,
  props,
  onClose,
}: {
  item: S3Object;
  props: FileGridProps;
  onClose: () => void;
}) {
  const isFolder = item.type === "folder";
  const hidden = isFolder && props.hiddenFolders.includes(item.path);
  const rows: [string, () => void][] = isFolder
    ? [
        ["Открыть", () => props.onOpenFolder(item)],
        [hidden ? "Показывать" : "Скрыть у всех", () => props.onToggleVisibility(item.path)],
        ["Переименовать", () => props.onRename(item)],
        ["Удалить", () => props.onDelete(item)],
      ]
    : [
        ["Открыть", () => props.onOpenFile(item)],
        ["Скачать", () => props.onDownload(item.path)],
        ["Переименовать", () => props.onRename(item)],
        ["Удалить", () => props.onDelete(item)],
      ];
  if (!isFolder && props.getPublicUrl(item.path)) {
    rows.splice(2, 0, ["Копировать ссылку", () => props.onCopyUrl(props.getPublicUrl(item.path))]);
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full rounded-t-3xl bg-zinc-900 pb-[max(2rem,env(safe-area-inset-bottom))] ring-1 ring-white/8 md:mx-auto md:mb-8 md:max-w-sm md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 mb-3 h-1 w-10 rounded-full bg-white/20 md:hidden" />
        <p className="truncate px-5 pb-2 text-sm font-semibold text-white">{fileLabel(item.name)}</p>
        <div className="p-3">
          {rows.map(([label, fn]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                (fn as () => void)();
                onClose();
              }}
              className={cn(
                "flex min-h-12 w-full items-center rounded-2xl px-4 text-left text-sm",
                label === "Удалить" ? "text-red-400" : "text-zinc-200",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
