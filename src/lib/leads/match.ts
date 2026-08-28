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

export function leadCarIds(lead: Lead): string[] {
  const ids = [...(lead.carIds || [])];
  if (lead.primaryCarId && !ids.includes(lead.primaryCarId)) ids.unshift(lead.primaryCarId);
  return ids;
}

export function leadMatchesCar(lead: Lead, car: CatalogCar): boolean {
  if (leadCarIds(lead).includes(car.id)) return true;
  const text = (lead.car || "").toLowerCase().trim();
  if (!text) return false;
  const make = (car.make || "").toLowerCase();
  const model = (car.model || "").toLowerCase();
  if (make && model && text.includes(make) && text.includes(model)) return true;
  const name = (car.name || "").toLowerCase();
  if (name.length > 5 && text.includes(name)) return true;
  return false;
}

export function resolveLeadCar(lead: Lead, cars: CatalogCar[]): CatalogCar | null {
  const ids = leadCarIds(lead);
  for (const id of ids) {
    const hit = cars.find((c) => c.id === id);
    if (hit) return hit;
  }
  if (!lead.car) return null;
  return cars.find((c) => leadMatchesCar(lead, c)) || null;
}

export function carTitle(car: CatalogCar) {
  return [car.name, car.year].filter(Boolean).join(" · ");
}
