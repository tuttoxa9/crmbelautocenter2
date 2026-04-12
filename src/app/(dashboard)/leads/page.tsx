"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lead } from "@/lib/types";
import { subscribeToLeads } from "@/lib/leadService";
import { LeadColumn } from "@/components/leads/LeadColumn";
import { VisitTimeline } from "@/components/leads/VisitTimeline";
import { Spinner } from "@/components/ui/spinner";
import { LeadDetailsModal } from "@/components/leads/LeadDetailsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadList } from "@/components/leads/LeadList";
import { format, isSameDay, startOfDay, addDays, subDays } from "date-fns";
import { ru } from "date-fns/locale";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));

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
    // Only subscribe to active pipeline statuses. Archive tabs fetch their own data.
    const activeStatuses: import("@/lib/types").LeadStatus[] = [
      "new", "in_progress", "visit", "no_answer", "thinking", "callback"
    ];
    const unsubscribe = subscribeToLeads((fetchedLeads) => {
      setLeads(fetchedLeads);
      setIsLoading(false);
    }, activeStatuses);
    return () => unsubscribe();
  }, []);

  const isTodayDate = isSameDay(selectedDate, new Date());

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchesName = lead.name?.toLowerCase().includes(query) || false;
    const matchesPhone = lead.phone?.toLowerCase().includes(query) || false;
    const matchesCar = lead.car?.toLowerCase().includes(query) || false;
    return matchesName || matchesPhone || matchesCar;
  });

  // Date Filtering Logic
  const dateFilteredLeads = filteredLeads.filter(lead => {
    // New leads are ALWAYS visible on ANY date (until they are taken in progress)
    if (lead.status === "new") return true;

    // Terminal statuses are hidden from the pipeline (shown only in Base)
    if (["refusal", "bank_refusal", "success", "spam"].includes(lead.status)) return false;

    // If a lead has a nextActionDate, check if it belongs to the selected date
    if (lead.nextActionDate) {
      const actionDate = new Date(lead.nextActionDate);
      const isSameAsSelected = isSameDay(actionDate, selectedDate);

      // If today is selected, also show overdue leads (actionDate < today)
      if (isTodayDate && actionDate < startOfDay(new Date())) {
        return true;
      }

      return isSameAsSelected;
    }

    // If no action date is set, show them only on "Today"
    return isTodayDate;
  });

  // Pipeline Columns
  const newLeads = dateFilteredLeads.filter(l => l.status === "new").sort((a, b) => b.createdAt - a.createdAt);

  const inProgressLeads = dateFilteredLeads.filter(l => l.status === "in_progress").sort((a, b) => {
    const aTime = a.history[a.history.length - 1]?.changedAt || a.updatedAt;
    const bTime = b.history[b.history.length - 1]?.changedAt || b.updatedAt;
    return bTime - aTime;
  });

  const callbackLeads = dateFilteredLeads.filter(l => l.status === "callback").sort((a, b) => (a.nextActionDate || Infinity) - (b.nextActionDate || Infinity));

  const noAnswerLeads = dateFilteredLeads.filter(l => l.status === "no_answer").sort((a, b) => {
    const aTime = a.history[a.history.length - 1]?.changedAt || a.updatedAt;
    const bTime = b.history[b.history.length - 1]?.changedAt || b.updatedAt;
    return bTime - aTime;
  });

  const thinkingLeads = dateFilteredLeads.filter(l => l.status === "thinking").sort((a, b) => {
    const aTime = a.history[a.history.length - 1]?.changedAt || a.updatedAt;
    const bTime = b.history[b.history.length - 1]?.changedAt || b.updatedAt;
    return bTime - aTime;
  });

  const visitLeads = dateFilteredLeads.filter(l => l.status === "visit").sort((a, b) => (a.nextActionDate || Infinity) - (b.nextActionDate || Infinity));

  // All Leads sorted by creation date
  const allLeadsSorted = [...filteredLeads].sort((a, b) => b.createdAt - a.createdAt);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-50/50">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const handleToday = () => setSelectedDate(startOfDay(new Date()));

  return (
    <div className="h-full flex flex-col bg-zinc-50/30">
      {/* Header */}
      <header className="flex-none px-4 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-100 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">Лиды</h1>
          <p className="text-sm text-zinc-500 font-medium">Контроль заявок</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
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

          <TabsContent value="pipeline" className="flex-1 flex flex-col mt-0 outline-none h-full overflow-hidden">
            {/* Date Navigation */}
            <div className="flex items-center justify-between bg-white px-4 py-2 rounded-2xl shadow-sm border border-zinc-100 mb-4 mx-auto w-full max-w-lg">
              <Button variant="ghost" size="icon" onClick={handlePrevDay} className="hover:bg-zinc-100 text-zinc-600 rounded-xl">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex flex-col items-center cursor-pointer hover:bg-zinc-50 px-4 py-1 rounded-xl transition-colors" onClick={handleToday}>
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">
                  {isTodayDate ? "Сегодня" : "Выбранная дата"}
                </span>
                <div className="flex items-center gap-2">
                  <CalendarIcon className={`w-4 h-4 ${isTodayDate ? 'text-blue-500' : 'text-zinc-600'}`} />
                  <span className={`text-base font-bold ${isTodayDate ? 'text-blue-600' : 'text-zinc-800'}`}>
                    {format(selectedDate, "d MMMM yyyy", { locale: ru })}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleNextDay} className="hover:bg-zinc-100 text-zinc-600 rounded-xl">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Pipeline Columns - Horizontal Scroll */}
            <div className="flex-1 flex overflow-x-auto gap-4 lg:gap-6 hide-scrollbar pb-4 snap-x snap-mandatory">
              <div className="flex h-full snap-center pl-2 lg:pl-0">
                <LeadColumn leads={newLeads} title="Новые" onSelectLead={setSelectedLead} />
              </div>
              <div className="flex h-full snap-center">
                <LeadColumn leads={inProgressLeads} title="В работе" onSelectLead={setSelectedLead} />
              </div>
              <div className="flex h-full snap-center">
                <LeadColumn leads={callbackLeads} title="Перезвонить" onSelectLead={setSelectedLead} />
              </div>
              <div className="flex h-full snap-center">
                <LeadColumn leads={noAnswerLeads} title="Недозвон" onSelectLead={setSelectedLead} />
              </div>
              <div className="flex h-full snap-center">
                <LeadColumn leads={thinkingLeads} title="Думает" onSelectLead={setSelectedLead} />
              </div>
              <div className="flex h-full snap-center pr-4 lg:pr-0">
                <LeadColumn leads={visitLeads} title="Приезд" onSelectLead={setSelectedLead} />
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

      <LeadDetailsModal
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => {
          if (!open) setSelectedLead(null);
        }}
      />
    </div>
  );
}
