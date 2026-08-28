/** Human-facing file names. Old uploads used `1712345678901_name.ext`. */

export function fileLabel(fileName: string): string {
  const base = fileName.split("/").pop() || fileName;
  return /^\d{13}_/.test(base) ? base.slice(14) : base;
}

export function safeFileName(name: string): string {
  const trimmed = name
    .replace(/[/\\]/g, "_")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/^\.+$/, "")
    .trim();
  return trimmed || "file";
}

export function withCollisionSuffix(name: string, existingLower: Set<string>): string {
  if (!existingLower.has(name.toLowerCase())) return name;
  const dot = name.lastIndexOf(".");
  const hasExt = dot > 0 && name.length - dot <= 8 && !name.slice(dot + 1).includes(" ");
  const stem = hasExt ? name.slice(0, dot) : name;
  const ext = hasExt ? name.slice(dot) : "";
  let n = 2;
  while (existingLower.has(`${stem} (${n})${ext}`.toLowerCase())) n += 1;
  return `${stem} (${n})${ext}`;
}

export function encodeStoragePath(path: string): string {
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

export function asciiFallbackName(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  return ascii || "download";
}

export function isImageName(name: string) {
  return /\.(jpe?g|png|gif|webp|svg|avif|heic|heif)$/i.test(name);
}

export function isVideoName(name: string) {
  return /\.(mp4|mov|m4v|avi|webm|mkv)$/i.test(name);
}

export function isDocName(name: string) {
  return /\.(pdf|docx?|xlsx?|pptx?|txt|rtf)$/i.test(name);
}

export function formatBytes(bytes?: number | null) {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / k ** i).toFixed(i === 0 ? 0 : 1))} ${sizes[i]}`;
}

export function ruCount(n: number, one: string, few: string, many: string) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return `${n} ${many}`;
  if (last === 1) return `${n} ${one}`;
  if (last >= 2 && last <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}
