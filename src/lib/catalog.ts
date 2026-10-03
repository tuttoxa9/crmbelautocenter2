import type { CatalogCar } from "@/lib/types";

export type CatalogLoad = { ok: true; cars: CatalogCar[] } | { ok: false; cars: [] };

export async function loadCatalogCars(opts?: { includeSold?: boolean; id?: string }): Promise<CatalogLoad> {
  try {
    const params = new URLSearchParams();
    if (opts?.includeSold) params.set("includeSold", "1");
    if (opts?.id) params.set("id", opts.id);
    const q = params.toString();
    const res = await fetch(`/api/catalog/cars${q ? `?${q}` : ""}`);
    if (!res.ok) return { ok: false, cars: [] };
    const data = await res.json().catch(() => ({}));
    const cars = Array.isArray(data.cars) ? (data.cars as CatalogCar[]) : [];
    return { ok: true, cars };
  } catch {
    return { ok: false, cars: [] };
  }
}

export async function fetchCatalogCars(opts?: { includeSold?: boolean; id?: string }): Promise<CatalogCar[]> {
  const loaded = await loadCatalogCars(opts);
  return loaded.cars;
}

export async function fetchCatalogCar(id: string): Promise<CatalogCar | null> {
  const cars = await fetchCatalogCars({ includeSold: true, id });
  return cars[0] || null;
}
