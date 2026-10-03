import type { CatalogCar, Lead, LeadStatus } from "@/lib/types";

export const ACTIVE_STATUSES: LeadStatus[] = [
  "new",
  "in_progress",
  "visit",
  "no_answer",
  "thinking",
  "callback",
];

export const TERMINAL_STATUSES: LeadStatus[] = ["success", "refusal", "bank_refusal", "spam"];

export const WORKING_STATUSES: LeadStatus[] = [
  "in_progress",
  "visit",
  "callback",
  "no_answer",
  "thinking",
];

export function needsNextAction(status: LeadStatus) {
  return WORKING_STATUSES.includes(status);
}

export function isActiveStatus(status: LeadStatus) {
  return ACTIVE_STATUSES.includes(status);
}

export function phoneKey(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.slice(-9);
}

/** Name, phone, car text, and notes. Phone digits match even with spaces and +375. */
export function leadMatchesQuery(lead: Lead, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  const phoneDigits = (lead.phone || "").replace(/\D/g, "");
  if (digits.length >= 3 && phoneDigits.includes(digits)) return true;
  return [lead.name, lead.phone, lead.car, lead.notes].some((value) =>
    (value || "").toLowerCase().includes(q),
  );
}

export function leadCarIds(lead: Lead): string[] {
  const ids = [...(lead.carIds || [])];
  if (lead.primaryCarId && !ids.includes(lead.primaryCarId)) ids.unshift(lead.primaryCarId);
  const fallbackId =
    (lead as unknown as { carId?: string }).carId ||
    (lead.payload as { carId?: string; car_id?: string } | undefined)?.carId ||
    (lead.payload as { carId?: string; car_id?: string } | undefined)?.car_id;
  if (fallbackId && typeof fallbackId === "string" && !ids.includes(fallbackId)) {
    ids.push(fallbackId);
  }
  return ids;
}

export function leadMatchesCar(lead: Lead, car: CatalogCar): boolean {
  return leadCarIds(lead).includes(car.id);
}

export function resolveLeadCar(lead: Lead, cars: CatalogCar[]): CatalogCar | null {
  for (const id of leadCarIds(lead)) {
    const hit = cars.find((c) => c.id === id);
    if (hit) return hit;
  }
  return null;
}

export function carTitle(car: CatalogCar) {
  return [car.name, car.year].filter(Boolean).join(" · ");
}

export function isMetaLead(lead: { source?: string; payload?: Record<string, unknown> | null }): boolean {
  if (lead.source !== "instagram" || !lead.payload) return false;
  const payload = lead.payload;
  return Boolean(
    payload.adId || payload.ad_id || payload.leadgenId || payload.leadgen_id || payload.formId || payload.form_id || payload.linkKind,
  );
}

export function metaOriginLine(lead: Lead): string | null {
  if (!isMetaLead(lead)) return null;
  const linked = leadCarIds(lead).length > 0;
  const kind = lead.payload?.linkKind;
  if (!linked && kind === "none") return "Объявление Meta без автомобиля";
  if (!linked) return "Объявление Meta без машины на складе";
  return "Из объявления Meta";
}
