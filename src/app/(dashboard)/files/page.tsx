import { Suspense } from "react";
import { FileManager } from "@/components/files/FileManager";

export default function FilesPage() {
  return (
    <Suspense fallback={<div className="h-full bg-[#111113]" />}>
      <FileManager />
    </Suspense>
  );
}
