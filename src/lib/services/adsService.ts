import { AdCar, AdCampaignType, AdPriceTier, AdsSettings } from "../types";

export const DEFAULT_ADS_SETTINGS: AdsSettings = {
  rk1Days: 17,
  rk2Days: 14,
  targetCarsPerDay: 3,
  isActive: true,
};

export function calculatePriceTier(priceUsd: number): AdPriceTier {
  const price = Number(priceUsd) || 0;
  if (price < 7000) return 'tier_under_7k';
  if (price < 13000) return 'tier_7k_13k';
  if (price < 20000) return 'tier_13k_20k';
  return 'tier_20k_plus';
}

export function getPriceTierLabel(tier: AdPriceTier): string {
  switch (tier) {
    case 'tier_under_7k':
      return 'До $7 000';
    case 'tier_7k_13k':
      return '$7 000 – $13 000';
    case 'tier_13k_20k':
      return '$13 000 – $20 000';
    case 'tier_20k_plus':
      return '$20 000+';
    default:
      return 'Не указана';
  }
}

export function getCampaignLabel(campaign: AdCampaignType): string {
  switch (campaign) {
    case 'rk1':
      return 'РК 1';
    case 'rk2':
      return 'РК 2';
    case 'waiting_video':
      return 'Ожидают съёмки';
    case 'ready_for_ads':
      return 'Отснято';
    default:
      return campaign;
  }
}

export function calculateDaysInAd(startedAt: number): number {
  if (!startedAt) return 0;
  const diffMs = Date.now() - startedAt;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function getMidnight(dateOrTimestamp: Date | number = Date.now()): number {
  const d = new Date(dateOrTimestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Formats timestamp or Date to 'YYYY-MM-DD' in Europe/Minsk (UTC+3) timezone
 */
export function getMinskDateKey(dateOrTimestamp: Date | number = Date.now()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Minsk',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(dateOrTimestamp));
  } catch {
    const d = new Date(dateOrTimestamp);
    return d.toISOString().split('T')[0];
  }
}

/**
 * Converts 'YYYY-MM-DD' dateKey to canonical UTC noon timestamp (12:00:00Z)
 * Anchoring at 12:00:00 UTC ensures it NEVER shifts to another date in any timezone.
 */
export function minskDateKeyToTimestamp(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Adds N calendar days to a 'YYYY-MM-DD' dateKey
 */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return d.toISOString().split('T')[0];
}

/**
 * Calculates calendar difference in days between two 'YYYY-MM-DD' date keys (B - A)
 */
export function getDateKeyDiffDays(dateKeyA: string, dateKeyB: string): number {
  const tsA = minskDateKeyToTimestamp(dateKeyA);
  const tsB = minskDateKeyToTimestamp(dateKeyB);
  return Math.round((tsB - tsA) / (1000 * 60 * 60 * 24));
}

/**
 * Calculates calendar day offset between today (Minsk) and car's targetRotationDate
 * Returns: 0 = today, 1 = tomorrow, -1 = overdue (yesterday), etc.
 */
export function getCalendarDaysLeft(targetTimestamp?: number | null, fallbackStartedAt?: number, fallbackMaxDays?: number): number {
  const todayKey = getMinskDateKey(Date.now());
  
  if (targetTimestamp) {
    const targetKey = getMinskDateKey(targetTimestamp);
    return getDateKeyDiffDays(todayKey, targetKey);
  }
  
  if (fallbackStartedAt && fallbackMaxDays) {
    const targetKey = getMinskDateKey(fallbackStartedAt + fallbackMaxDays * 24 * 60 * 60 * 1000);
    return getDateKeyDiffDays(todayKey, targetKey);
  }
  
  return 0;
}

export const rebalanceAdCars = async (targetCarsPerDay?: number): Promise<{ success: boolean; totalBalanced?: number; cars?: AdCar[]; error?: string }> => {
  try {
    const res = await fetch('/api/ads/rebalance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCarsPerDay }),
    });
    return await res.json();
  } catch (err: any) {
    console.error('Error rebalancing ad cars on server:', err);
    return { success: false, error: err?.message || 'Server rebalance failed' };
  }
};

export const getAdCars = async (): Promise<AdCar[]> => {
  try {
    const res = await fetch('/api/ads/cars', { cache: 'no-store' });
    const data = await res.json();
    if (data.success && Array.isArray(data.cars)) {
      return data.cars;
    }
  } catch (err) {
    console.error('Error fetching ad cars:', err);
  }
  return [];
};

export const createAdCar = async (
  carData: Omit<AdCar, "id" | "createdAt" | "updatedAt">
): Promise<AdCar> => {
  const res = await fetch('/api/ads/cars', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(carData),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to create ad car');
  }

  return data.car;
};

export const updateAdCar = async (
  id: string,
  updates: Partial<Omit<AdCar, "id" | "createdAt">>
) => {
  const res = await fetch(`/api/ads/cars/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update ad car');
  }
};

export const switchAdCarCampaign = async (
  id: string,
  targetCampaign: AdCampaignType,
  customMaxDays?: number
) => {
  const updates: any = {
    campaign: targetCampaign,
    startedAt: Date.now(),
    lastAlertSentAt: null,
  };

  if (customMaxDays !== undefined) {
    updates.maxDays = customMaxDays;
  }

  await updateAdCar(id, updates);
};

export const resetAdCarTimer = async (id: string) => {
  await updateAdCar(id, {
    startedAt: Date.now(),
    lastAlertSentAt: null,
  });
};

export const deleteAdCar = async (id: string) => {
  const res = await fetch(`/api/ads/cars/${id}`, {
    method: 'DELETE',
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete ad car');
  }
};

export const getAdsSettings = async (): Promise<AdsSettings> => {
  try {
    const res = await fetch('/api/ads/settings', { cache: 'no-store' });
    const data = await res.json();
    if (data.success && data.settings) {
      return data.settings;
    }
  } catch (err) {
    console.error('Error fetching ads settings:', err);
  }
  return DEFAULT_ADS_SETTINGS;
};

export const updateAdsSettings = async (settings: Partial<AdsSettings>) => {
  const res = await fetch('/api/ads/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to save ads settings');
  }
};
