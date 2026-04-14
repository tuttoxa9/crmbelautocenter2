"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LeadDetails } from "./LeadDetails";
import { Lead } from "@/lib/types";

interface LeadDetailsDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailsDrawer({ lead, open, onOpenChange }: LeadDetailsDrawerProps) {
  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] p-0 bg-[#FFFFFF] border-l border-zinc-200 shadow-2xl"
      >
        <LeadDetails lead={lead} key={lead.id} onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
