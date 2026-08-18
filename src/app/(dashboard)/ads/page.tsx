import { Metadata } from "next";
import { AdsDashboard } from "@/components/ads/AdsDashboard";

export const metadata: Metadata = {
  title: "Реклама TikTok Ads | Белавтоцентр CRM",
  description: "Управление рекламными кампаниями TikTok Ads и циклической ротацией креативов",
};

export default function AdsPage() {
  return (
    <div className="h-full bg-[#F8F9FA] overflow-y-auto">
      <AdsDashboard />
    </div>
  );
}
