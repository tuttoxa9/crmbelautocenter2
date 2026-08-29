import { Metadata } from "next";
import { QualityApp } from "@/components/quality/QualityApp";

export const metadata: Metadata = {
  title: "Контроль качества | Белавтоцентр CRM",
};

export default function QualityPage() {
  return (
    <div className="h-full overflow-hidden bg-ads-bg">
      <QualityApp />
    </div>
  );
}
