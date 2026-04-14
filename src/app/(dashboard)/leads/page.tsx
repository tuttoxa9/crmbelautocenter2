"use client";

import { useEffect, useState, useMemo } from "react";
import { subscribeToLeads } from "@/lib/leadService";
import { Lead } from "@/lib/types";
import { Search, LayoutGrid, AlertCircle, CalendarClock, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LeadList } from "@/components/leads/LeadList";
import { LeadDetailsDrawer } from "@/components/leads/LeadDetailsDrawer";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { useDebounce } from "use-debounce";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  useEffect(() => {
    // Fetch all active/pipeline statuses
    const activeStatuses: import("@/lib/types").LeadStatus[] = [
      "new", "in_progress", "visit", "no_answer", "thinking", "callback"
    ];

    const unsubscribe = subscribeToLeads((fetchedLeads) => {
      setLeads(fetchedLeads);
      setIsLoading(false);

      // Update selected lead if it exists in the new fetch
      setSelectedLead((prevSelected) => {
        if (prevSelected) {
          const updated = fetchedLeads.find(l => l.id === prevSelected.id);
          return updated || null;
        }
        return prevSelected;
      });
    }, activeStatuses);

    return () => unsubscribe();
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (!debouncedSearchQuery.trim()) return true;
      const query = debouncedSearchQuery.toLowerCase();
      return (lead.name?.toLowerCase().includes(query) || lead.phone?.toLowerCase().includes(query) || lead.car?.toLowerCase().includes(query));
    });
  }, [leads, debouncedSearchQuery]);

  // KPI calculations
  const stats = useMemo(() => {
    return {
      new: leads.filter(l => l.status === "new").length,
      active: leads.filter(l => ["in_progress", "thinking", "callback", "no_answer"].includes(l.status)).length,
      scheduled: leads.filter(l => l.status === "visit").length,
      total: leads.length
    };
  }, [leads]);

  return (
    <div className="h-full flex flex-col bg-[#F4F5F7] text-zinc-900 font-sans overflow-hidden">

      {/* Header */}
      <header className="flex-none px-6 py-6 sm:px-8 border-b border-zinc-200 bg-white shadow-sm z-10">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Лиды</h1>
            <p className="text-sm text-zinc-500 font-medium mt-1">Рабочее пространство</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск лида (имя, телефон)..."
                className="pl-10 h-12 rounded-xl border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white transition-colors w-full shadow-sm"
              />
            </div>
            <CreateLeadDialog />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
        <div className="max-w-[1400px] mx-auto space-y-8">

          {/* KPI Widgets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-red-500" /> Новые
              </div>
              <span className="text-3xl font-black">{stats.new}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs uppercase tracking-wider">
                <Activity className="w-4 h-4 text-blue-500" /> В работе
              </div>
              <span className="text-3xl font-black">{stats.active}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs uppercase tracking-wider">
                <CalendarClock className="w-4 h-4 text-purple-500" /> Приезд
              </div>
              <span className="text-3xl font-black">{stats.scheduled}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs uppercase tracking-wider">
                <LayoutGrid className="w-4 h-4 text-zinc-500" /> Всего активных
              </div>
              <span className="text-3xl font-black">{stats.total}</span>
            </div>
          </div>

          {/* Smart List */}
          <div>
            <h2 className="text-lg font-black text-zinc-800 mb-4 ml-1">Текущие задачи ({filteredLeads.length})</h2>
            <LeadList
              leads={filteredLeads}
              isLoading={isLoading}
              onSelect={setSelectedLead}
              selectedLeadId={selectedLead?.id || null}
            />
          </div>

        </div>
      </div>

      {/* Slide-out Drawer */}
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
