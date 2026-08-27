import { Metadata } from "next";
import { AdsDashboard } from "@/components/ads/AdsDashboard";

export const metadata: Metadata = {
  title: "Реклама TikTok | Белавтоцентр CRM",
  description: "Управление рекламными кампаниями TikTok и циклической ротацией креативов",
};

export default function AdsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <AdsDashboard />
    </div>
  );
}
