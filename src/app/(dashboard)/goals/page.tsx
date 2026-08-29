import { Metadata } from "next";
import { QualityApp } from "@/components/quality/QualityApp";

export const metadata: Metadata = {
  title: "Мои цели | Белавтоцентр CRM",
};

export default function GoalsPage() {
  return (
    <div className="h-full overflow-hidden bg-ads-bg">
      <QualityApp />
    </div>
  );
}
