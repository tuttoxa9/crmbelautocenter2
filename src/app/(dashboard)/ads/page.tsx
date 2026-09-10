import { Metadata } from "next";
import { AdsDashboard } from "@/components/ads/AdsDashboard";

export const metadata: Metadata = {
  title: "Реклама TikTok | Белавтоцентр CRM",
  description: "Съёмка, эфир и смена кампаний TikTok",
};

export default function AdsPage() {
  return (
    <div className="h-full overflow-hidden bg-ads-bg">
      <AdsDashboard />
    </div>
  );
}
