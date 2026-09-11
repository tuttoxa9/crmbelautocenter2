import { Metadata } from "next";
import { AdsDashboard } from "@/components/ads/AdsDashboard";

export const metadata: Metadata = {
  title: "Реклама TikTok | Белавтоцентр CRM",
  description: "Перенос кампаний, съёмка и эфир TikTok",
};

export default function AdsPage() {
  return (
    <div className="h-full overflow-hidden bg-ads-bg">
      <AdsDashboard />
    </div>
  );
}
