export function catalogIsSold(d: any): boolean {
  if (!d || typeof d !== "object") return false;
  return d.status === "sold" || d.isAvailable === false || d.is_available === false || d.isSold === true;
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
    if (catalogIsSold(d)) sold.add(row.id);
  }
  return sold;
}
