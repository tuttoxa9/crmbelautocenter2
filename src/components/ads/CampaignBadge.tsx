"use client";

import type { AdCampaignType } from "@/lib/types";
import { CAMPAIGN_SHORT } from "@/lib/ads/copy";
import { cn } from "@/lib/utils";

export function CampaignBadge({
  campaign,
  sold,
  className,
}: {
  campaign?: AdCampaignType | string;
  sold?: boolean;
  className?: string;
}) {
  if (sold) {
    return (
      <span className={cn("inline-flex h-[18px] items-center rounded-md bg-ads-danger-soft px-1.5 text-[10px] font-medium text-ads-danger", className)}>
        Продана
      </span>
    );
  }
  const id = (campaign || "") as AdCampaignType;
  const label = CAMPAIGN_SHORT[id] || "—";
  return (
    <span
      className={cn(
        "inline-flex h-[18px] items-center rounded-md px-1.5 text-[10px] font-medium",
        id === "rk1" && "bg-ads-ink text-ads-paper",
        id === "rk2" && "bg-transparent text-ads-ink ring-1 ring-ads-ink/50",
        id === "waiting_video" && "bg-ads-surface text-ads-ink ring-1 ring-ads-line-strong",
        id === "ready_for_ads" && "bg-ads-ink/15 text-ads-ink",
        className,
      )}
    >
      {label}
    </span>
  );
}
