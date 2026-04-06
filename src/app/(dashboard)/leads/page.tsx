"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { Button } from "@/components/ui/button";
import { Lead } from "@/lib/types";
import { subscribeToLeads } from "@/lib/leadService";
import { LeadColumn } from "@/components/leads/LeadColumn";
import { VisitTimeline } from "@/components/leads/VisitTimeline";
import { Spinner } from "@/components/ui/spinner";
import { LeadDetailsDrawer } from "@/components/leads/LeadDetailsDrawer";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Sync selectedLead when leads change
  useEffect(() => {
    if (selectedLead) {
      const updatedSelectedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedSelectedLead) {
        setSelectedLead(updatedSelectedLead);
      } else {
        // If the lead was deleted, close the drawer
        setSelectedLead(null);
      }
    }
  }, [leads, selectedLead]);

  useEffect(() => {
    const unsubscribe = subscribeToLeads((fetchedLeads) => {
      setLeads(fetchedLeads);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sort and filter new leads
  const newLeads = leads
    .filter(lead => lead.status === "new")
    .sort((a, b) => b.createdAt - a.createdAt); // Новые сверху

  // Sort and filter active leads
  const actionLeads = leads
    .filter(lead => lead.status === "in_progress" || lead.status === "callback")
    .sort((a, b) => {
      // Prioritize callback leads with closest nextActionDate
      if (a.status === "callback" && b.status === "callback") {
        return (a.nextActionDate || Infinity) - (b.nextActionDate || Infinity);
      }
      if (a.status === "callback") return -1;
      if (b.status === "callback") return 1;

      const aTime = a.history[a.history.length - 1]?.changedAt || a.updatedAt;
      const bTime = b.history[b.history.length - 1]?.changedAt || b.updatedAt;
      return bTime - aTime; // Недавние изменения сверху
    });

  const pausedLeads = leads
    .filter(lead => lead.status === "thinking" || lead.status === "no_answer")
    .sort((a, b) => {
      const aTime = a.history[a.history.length - 1]?.changedAt || a.updatedAt;
      const bTime = b.history[b.history.length - 1]?.changedAt || b.updatedAt;
      return bTime - aTime; // Недавние изменения сверху
    });

  // Sort and filter visit leads
  const visitLeads = leads
    .filter(lead => lead.status === "visit")
    .sort((a, b) => (a.nextActionDate || Infinity) - (b.nextActionDate || Infinity)); // Ближайшие приезды сверху

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-50/50">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-50/30">
      {/* Header */}
      <header className="flex-none px-4 sm:px-8 py-6 flex justify-between items-center border-b border-zinc-100 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">Zero Inbox</h1>
          <p className="text-sm text-zinc-500 font-medium">Компактные колонки</p>
        </div>

        <CreateLeadDialog>
          <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl shadow-lg shadow-zinc-900/20 px-6 h-[48px] font-semibold transition-all">
            <Plus className="w-5 h-5 mr-2" /> Добавить
          </Button>
        </CreateLeadDialog>
      </header>

      {/* Bento Grid layout */}
      <div className="flex-1 overflow-hidden p-4 sm:p-8">
        <div className="max-w-[1600px] h-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">

          <div className="flex justify-center h-full">
            <LeadColumn leads={newLeads} title="Новые" onSelectLead={setSelectedLead} />
          </div>

          <div className="flex justify-center h-full">
            <LeadColumn leads={actionLeads} title="В работе / Звонки" onSelectLead={setSelectedLead} />
          </div>

          <div className="flex justify-center h-full">
            <LeadColumn leads={pausedLeads} title="На паузе" onSelectLead={setSelectedLead} />
          </div>

          <div className="flex justify-center h-full">
            <LeadColumn leads={visitLeads} title="Радар приездов" onSelectLead={setSelectedLead} />
          </div>

        </div>
      </div>

      <LeadDetailsDrawer
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => {
          if (!open) setSelectedLead(null);
        }}
      />
    </div>
  );
}
