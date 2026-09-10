import { sql } from "@/lib/db";

export function catalogIsSold(d: any): boolean {
  if (!d || typeof d !== "object") return false;
  return (
    d.status === "sold" ||
    d.isAvailable === false ||
    d.is_available === false ||
    d.isSold === true
  );
}

export function collectSoldIds(rows: { id: string; data: unknown }[]): Set<string> {
  const sold = new Set<string>();
  for (const row of rows) {
    let d = row.data;
    if (typeof d === "string") {
      try {
        d = JSON.parse(d);
      } catch {
        d = {};
      }
    }
    if (catalogIsSold(d)) sold.add(String(row.id));
  }
  return sold;
}

export function parseJson(raw: unknown) {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" ? raw : {};
}

/** Проданные из каталога сразу снимаются с доски и из графика. */
export async function sweepSoldAdCars(): Promise<{ removed: number; names: string[] }> {
  const catalogRows = await sql`SELECT id, data FROM cars`;
  const soldCarIds = collectSoldIds(catalogRows as { id: string; data: unknown }[]);
  if (soldCarIds.size === 0) return { removed: 0, names: [] };

  const adRows = await sql`SELECT id, data FROM ad_cars`;
  const names: string[] = [];
  const debtCarIds = new Set<string>();

  for (const row of adRows as { id: string; data: unknown }[]) {
    const d = parseJson(row.data) as Record<string, unknown>;
    const carId = d.carId ? String(d.carId) : "";
    if (!carId || !soldCarIds.has(carId)) continue;
    names.push(String(d.name || carId));
    debtCarIds.add(carId);
    await sql`DELETE FROM ad_cars WHERE id = ${row.id}`;
  }

  if (debtCarIds.size > 0) {
    try {
      const settingsRows = await sql`SELECT data FROM settings WHERE id = 'ads' LIMIT 1`;
      if (settingsRows.length) {
        const d = parseJson(settingsRows[0].data) as Record<string, unknown>;
        const debts = Array.isArray(d.tiktokDebts) ? d.tiktokDebts : [];
        const next = debts.filter((item: any) => !item?.carId || !debtCarIds.has(String(item.carId)));
        if (next.length !== debts.length) {
          await sql`
            INSERT INTO settings (id, data, created_at)
            VALUES ('ads', ${JSON.stringify({ ...d, tiktokDebts: next })}, ${new Date().toISOString()})
            ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify({ ...d, tiktokDebts: next })}
          `;
        }
      }
    } catch (err) {
      console.warn("sweepSoldAdCars: debts", err);
    }
  }

  return { removed: names.length, names };
}
