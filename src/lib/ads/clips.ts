import { sql } from "@/lib/db";

const AD_PREFIX = "videos/ads/";
const SMM_PREFIX = "videos/smm/";

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

export function clipFileName(carName: string, year: string | number | undefined, index: number) {
  const base = `${carName} ${year || ""}`.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "ролик";
  return index > 0 ? `${base} ${index + 1}.mp4` : `${base}.mp4`;
}

export async function loadSiteAdClips(carIds: string[]) {
  const unique = [...new Set(carIds.map((id) => String(id || "").trim()).filter(Boolean))];
  const map = new Map<
    string,
    { clips: { id: string; key: string; durationSec?: number; createdAt?: string }[]; name: string; year: string }
  >();
  if (!unique.length) return map;
  let rows: Record<string, unknown>[] = [];
  try {
    rows = await sql`SELECT id, data FROM cars WHERE id = ANY(${unique})`;
  } catch (error) {
    console.warn("ads clips any", error);
    const parts = await Promise.all(unique.map((id) => sql`SELECT id, data FROM cars WHERE id = ${id} LIMIT 1`));
    rows = parts.flat();
  }
  for (const row of rows) {
    const data = asRecord(row.data);
    const name = `${String(data.make || "")} ${String(data.model || "")}`.trim() || String(data.name || "");
    const year = data.year != null ? String(data.year) : "";
    const raw = Array.isArray(data.adClips) ? data.adClips : [];
    const clips = raw
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        id: String(item.id || ""),
        key: String(item.key || ""),
        durationSec: Number(item.durationSec) || undefined,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
      }))
      .filter((item) => item.id && item.key);
    map.set(String(row.id), { clips, name, year });
  }
  return map;
}

export function isAllowedClipKey(key: string) {
  if (!key || key.includes("..") || key.includes("//")) return false;
  return key.startsWith(AD_PREFIX) || key.startsWith(SMM_PREFIX);
}

export function keyFromVideoUrl(url: string) {
  const text = String(url || "");
  const match = text.match(/\/(videos\/(?:ads|smm)\/[^?]+)/);
  if (match) return decodeURIComponent(match[1]);
  if (isAllowedClipKey(text)) return text;
  return "";
}
