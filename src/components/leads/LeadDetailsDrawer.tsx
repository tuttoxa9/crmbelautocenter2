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
      <SheetContent side="right" showCloseButton={false} className="w-full sm:max-w-[65vw] lg:max-w-[800px] p-0 bg-zinc-50 border-l border-zinc-200">
        <LeadDetails lead={lead} key={lead.id} onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
