// Types for the Advertising Budget Calculator

export type AdPlatform = "meta" | "tiktok";

export interface AdCreative {
  id: string;
  name: string;
  createdAt: number;
}

export interface AdGroup {
  id: string;
  name: string;
  isPremium: boolean; // "Высокая стоимость автомобиля"
  weight: number; // 1 = normal, 2 = premium (auto-set based on isPremium)
  ads: AdCreative[];
  createdAt: number;
}

export interface AdCampaign {
  id: string;
  name: string;
  platform: AdPlatform;
  adGroups: AdGroup[];
  createdAt: number;
}

export interface BudgetPlan {
  id?: string;
  name: string;
  monthlyBudget: number; // Total monthly budget in USD
  campaigns: AdCampaign[];
  createdAt: number;
  updatedAt: number;
}

// Calculated output per ad group
export interface AdGroupBudgetResult {
  campaignId: string;
  campaignName: string;
  platform: AdPlatform;
  adGroupId: string;
  adGroupName: string;
  isPremium: boolean;
  adsCount: number;
  monthlyBudget: number;
  dailyBudget: number; // This is what to set in Meta/TikTok
  percentage: number; // % of total monthly budget
}
