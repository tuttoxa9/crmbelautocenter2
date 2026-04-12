"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LeadDetails } from "./LeadDetails";
import { Lead } from "@/lib/types";

interface LeadDetailsModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailsModal({ lead, open, onOpenChange }: LeadDetailsModalProps) {
  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[90vw] md:max-w-[80vw] lg:max-w-[1200px] h-[90vh] p-0 overflow-hidden bg-zinc-50 border border-zinc-200">
        <LeadDetails lead={lead} key={lead.id} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
