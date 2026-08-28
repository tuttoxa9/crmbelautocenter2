import { Metadata } from "next";
import { AdsDashboard } from "@/components/ads/AdsDashboard";

export const metadata: Metadata = {
  title: "Ротация | Белавтоцентр CRM",
  description: "Консоль ротации рекламы TikTok",
};

export default function AdsPage() {
  return (
    <div className="h-full overflow-hidden bg-ads-bg">
      <AdsDashboard />
    </div>
  );
}
