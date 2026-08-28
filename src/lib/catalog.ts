import type { CatalogCar } from "@/lib/types";

export async function fetchCatalogCars(opts?: { includeSold?: boolean; id?: string }): Promise<CatalogCar[]> {
  const params = new URLSearchParams();
  if (opts?.includeSold) params.set("includeSold", "1");
  if (opts?.id) params.set("id", opts.id);
  const q = params.toString();
  const res = await fetch(`/api/catalog/cars${q ? `?${q}` : ""}`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.cars) ? (data.cars as CatalogCar[]) : [];
}

export async function fetchCatalogCar(id: string): Promise<CatalogCar | null> {
  const cars = await fetchCatalogCars({ includeSold: true, id });
  return cars[0] || null;
}
