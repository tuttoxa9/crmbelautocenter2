/** Firestore sometimes gives Timestamp / seconds — always work in ms. */
export function toLeadMillis(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return value < 1e12 ? Math.round(value * 1000) : value;
  }
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof value === "object") {
    const v = value as { toMillis?: () => number; seconds?: number; _seconds?: number };
    if (typeof v.toMillis === "function") {
      const t = v.toMillis();
      return Number.isFinite(t) ? t : null;
    }
    const seconds = typeof v.seconds === "number" ? v.seconds : v._seconds;
    if (typeof seconds === "number" && Number.isFinite(seconds)) return seconds * 1000;
  }
  if (typeof value === "string") {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && asNum > 0) return asNum < 1e12 ? Math.round(asNum * 1000) : asNum;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function leadActionAt(lead: { nextActionDate?: unknown; createdAt?: unknown }): number {
  return toLeadMillis(lead.nextActionDate) || toLeadMillis(lead.createdAt) || 0;
}
