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
