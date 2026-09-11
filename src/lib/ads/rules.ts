import { sql } from "@/lib/db";

export type AdsRules = {
  perDay: number;
  rk1Days: number;
  rk2Days: number;
};

export const DEFAULT_ADS_RULES: AdsRules = {
  perDay: 3,
  rk1Days: 17,
  rk2Days: 14,
};

export function parseAdsRules(raw: unknown): AdsRules {
  let d: Record<string, unknown> = {};
  if (typeof raw === "string") {
    try {
      d = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      d = {};
    }
  } else if (raw && typeof raw === "object") {
    d = raw as Record<string, unknown>;
  }
  const perDay = Number(d.targetCarsPerDay);
  const rk1Days = Number(d.rk1Days);
  const rk2Days = Number(d.rk2Days);
  return {
    perDay: perDay > 0 ? perDay : DEFAULT_ADS_RULES.perDay,
    rk1Days: rk1Days > 0 ? rk1Days : DEFAULT_ADS_RULES.rk1Days,
    rk2Days: rk2Days > 0 ? rk2Days : DEFAULT_ADS_RULES.rk2Days,
  };
}

export async function loadAdsRules(): Promise<AdsRules> {
  try {
    const rows = await sql`SELECT data FROM settings WHERE id = 'ads' LIMIT 1`;
    if (rows.length) return parseAdsRules(rows[0].data);
  } catch {
    // defaults
  }
  return { ...DEFAULT_ADS_RULES };
}
