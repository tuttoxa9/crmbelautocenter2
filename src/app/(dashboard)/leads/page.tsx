"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lead } from "@/lib/types";
import { subscribeToLeads } from "@/lib/leadService";
import { LeadColumn } from "@/components/leads/LeadColumn";
import { VisitTimeline } from "@/components/leads/VisitTimeline";
import { Spinner } from "@/components/ui/spinner";
import { LeadDetailsDrawer } from "@/components/leads/LeadDetailsDrawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadList } from "@/components/leads/LeadList";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchesName = lead.name?.toLowerCase().includes(query) || false;
    const matchesPhone = lead.phone?.toLowerCase().includes(query) || false;
    const matchesCar = lead.car?.toLowerCase().includes(query) || false;
    return matchesName || matchesPhone || matchesCar;
  });

  // Sort and filter new leads
  const newLeads = filteredLeads
    .filter(lead => lead.status === "new")
    .sort((a, b) => b.createdAt - a.createdAt); // Новые сверху

  // Sort and filter active leads
  const actionLeads = filteredLeads
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

  const pausedLeads = filteredLeads
    .filter(lead => lead.status === "thinking" || lead.status === "no_answer")
    .sort((a, b) => {
      const aTime = a.history[a.history.length - 1]?.changedAt || a.updatedAt;
      const bTime = b.history[b.history.length - 1]?.changedAt || b.updatedAt;
      return bTime - aTime; // Недавние изменения сверху
    });

  // Sort and filter visit leads
  const visitLeads = filteredLeads
    .filter(lead => lead.status === "visit")
    .sort((a, b) => (a.nextActionDate || Infinity) - (b.nextActionDate || Infinity)); // Ближайшие приезды сверху

  // All Leads sorted by creation date
  const allLeadsSorted = [...filteredLeads].sort((a, b) => b.createdAt - a.createdAt);

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
      <header className="flex-none px-4 sm:px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-100 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">Zero Inbox</h1>
          <p className="text-sm text-zinc-500 font-medium">Компактные колонки</p>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени, номеру..."
              className="pl-9 h-[48px] rounded-2xl border-zinc-200 bg-white shadow-sm focus-visible:ring-blue-500 w-full"
            />
          </div>

          <CreateLeadDialog>
            <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl shadow-lg shadow-zinc-900/20 px-6 h-[48px] font-semibold transition-all">
              <Plus className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Добавить</span>
            </Button>
          </CreateLeadDialog>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-4 sm:p-8">
        <Tabs defaultValue="pipeline" className="h-full flex flex-col max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <TabsList className="grid w-[240px] grid-cols-2 p-1 bg-zinc-200/50 rounded-xl">
              <TabsTrigger value="pipeline" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm font-semibold">Воронка</TabsTrigger>
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm font-semibold">База лидов</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pipeline" className="flex-1 mt-0 outline-none h-full">
            {/*
              On mobile: flex container with horizontal scroll and snapping.
              On desktop (lg): grid with 4 columns.
            */}
            <div className="h-full flex overflow-x-auto snap-x snap-mandatory lg:grid lg:grid-cols-4 gap-6 hide-scrollbar pb-4 lg:pb-0">
              <div className="flex justify-center h-full min-w-[85vw] sm:min-w-[400px] lg:min-w-0 snap-center">
                <LeadColumn leads={newLeads} title="Новые" onSelectLead={setSelectedLead} />
              </div>

              <div className="flex justify-center h-full min-w-[85vw] sm:min-w-[400px] lg:min-w-0 snap-center">
                <LeadColumn leads={actionLeads} title="В работе / Звонки" onSelectLead={setSelectedLead} />
              </div>

              <div className="flex justify-center h-full min-w-[85vw] sm:min-w-[400px] lg:min-w-0 snap-center">
                <LeadColumn leads={pausedLeads} title="На паузе" onSelectLead={setSelectedLead} />
              </div>

              <div className="flex justify-center h-full min-w-[85vw] sm:min-w-[400px] lg:min-w-0 snap-center">
                <LeadColumn leads={visitLeads} title="Радар приездов" onSelectLead={setSelectedLead} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="all" className="flex-1 mt-0 outline-none h-full overflow-hidden bg-zinc-100/50 rounded-3xl border border-zinc-200/50 p-4 sm:p-6">
            <div className="max-w-2xl mx-auto h-full">
              <LeadList
                leads={allLeadsSorted}
                selectedLeadId={selectedLead?.id || null}
                onSelect={setSelectedLead}
              />
            </div>
          </TabsContent>
        </Tabs>
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
