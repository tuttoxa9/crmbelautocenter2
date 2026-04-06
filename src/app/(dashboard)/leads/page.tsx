"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { Button } from "@/components/ui/button";
import { SmartStack } from "@/components/leads/SmartStack";
import { VisitTimeline } from "@/components/leads/VisitTimeline";
import { LeadDetails } from "@/components/leads/LeadDetails";
import { Lead } from "@/lib/types";
import { subscribeToLeads } from "@/lib/leadService";
import { Spinner } from "@/components/ui/spinner";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLeads((fetchedLeads) => {
      setLeads(fetchedLeads);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const newLeads = useMemo(() => {
    return leads
      .filter((lead) => lead.status === "new")
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [leads]);

  const actionLeads = useMemo(() => {
    return leads
      .filter((lead) => lead.status === "in_progress" || lead.status === "callback")
      .sort((a, b) => {
        if (a.status === "callback" && b.status === "callback") {
           return (a.nextActionDate || 0) - (b.nextActionDate || 0);
        }
        if (a.status === "callback") return -1;
        if (b.status === "callback") return 1;

        const aTime = a.history.length > 0 ? a.history[a.history.length - 1].changedAt : a.updatedAt;
        const bTime = b.history.length > 0 ? b.history[b.history.length - 1].changedAt : b.updatedAt;
        return bTime - aTime;
      });
  }, [leads]);

  const pausedLeads = useMemo(() => {
    return leads
      .filter((lead) => lead.status === "thinking" || lead.status === "no_answer")
      .sort((a, b) => {
        const aTime = a.history.length > 0 ? a.history[a.history.length - 1].changedAt : a.updatedAt;
        const bTime = b.history.length > 0 ? b.history[b.history.length - 1].changedAt : b.updatedAt;
        return bTime - aTime;
      });
  }, [leads]);

  const visitLeads = useMemo(() => {
    return leads
      .filter((lead) => lead.status === "visit")
      .sort((a, b) => {
        const aDate = a.nextActionDate || 0;
        const bDate = b.nextActionDate || 0;
        return aDate - bDate;
      });
  }, [leads]);

  const selectedLead = useMemo(() => leads.find(l => l.id === selectedLeadId), [leads, selectedLeadId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50/50 -mx-4 -my-4 sm:-mx-8 sm:-my-8 p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900">Лиды</h2>
          <p className="text-sm font-medium text-zinc-500 mt-1">Smart Stacks</p>
        </div>
        <CreateLeadDialog>
          <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-6 shadow-sm h-11">
            <Plus className="mr-2 h-4 w-4" /> Добавить лид
          </Button>
        </CreateLeadDialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">

        {/* New Leads Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-zinc-800">Новые ({newLeads.length})</h3>
          </div>
          <SmartStack leads={newLeads} type="new" onSelectLead={(l) => setSelectedLeadId(l.id || null)} />
        </div>

        {/* Action Leads Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-zinc-800">В работе / Звонки ({actionLeads.length})</h3>
          </div>
          <SmartStack leads={actionLeads} type="active" onSelectLead={(l) => setSelectedLeadId(l.id || null)} />
        </div>

        {/* Paused Leads Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-zinc-800">На паузе ({pausedLeads.length})</h3>
          </div>
          <SmartStack leads={pausedLeads} type="active" onSelectLead={(l) => setSelectedLeadId(l.id || null)} />
        </div>

        {/* Visit Timeline Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-zinc-800">Радар приездов ({visitLeads.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
            <VisitTimeline leads={visitLeads} onSelectLead={(l) => setSelectedLeadId(l.id || null)} />
          </div>
        </div>

      </div>

      <Sheet open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLeadId(null)}>
        <SheetContent className="w-full sm:max-w-md p-0 border-l border-zinc-200">
           {selectedLead && (
             <LeadDetails key={selectedLead.id} lead={selectedLead} onClose={() => setSelectedLeadId(null)} />
           )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
