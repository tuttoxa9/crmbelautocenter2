"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Inbox } from "lucide-react";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { Button } from "@/components/ui/button";
import { LeadList } from "@/components/leads/LeadList";
import { LeadDetails } from "@/components/leads/LeadDetails";
import { Input } from "@/components/ui/input";
import { Lead } from "@/lib/types";
import { subscribeToLeads } from "@/lib/leadService";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "new" | "in_progress" | "no_answer">("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLeads((fetchedLeads) => {
      setLeads(fetchedLeads);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredLeads = leads.filter(lead => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      lead.name.toLowerCase().includes(searchLower) ||
      lead.phone.toLowerCase().includes(searchLower);

    let matchesFilter = true;
    if (filterMode === "new") matchesFilter = lead.status === "new";
    if (filterMode === "in_progress") matchesFilter = lead.status === "in_progress" || lead.status === "visit";
    if (filterMode === "no_answer") matchesFilter = lead.status === "no_answer";

    return matchesSearch && matchesFilter;
  });

  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;

  const FilterPill = ({ mode, label, count }: { mode: typeof filterMode, label: string, count?: number }) => (
    <button
      onClick={() => setFilterMode(mode)}
      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
        filterMode === mode
          ? 'bg-zinc-900 text-white shadow-md'
          : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
      }`}
    >
      {label} {count !== undefined && <span className="ml-1.5 opacity-70">({count})</span>}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-zinc-50/50 -mx-4 -my-4 sm:-mx-8 sm:-my-8 p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900">Умный Inbox</h2>
          <p className="text-sm font-medium text-zinc-500 mt-1">Вся работа с клиентами на одном экране</p>
        </div>
        <CreateLeadDialog>
          <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-6 shadow-sm h-11">
            <Plus className="mr-2 h-4 w-4" /> Добавить лид
          </Button>
        </CreateLeadDialog>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

        {/* Left Column - List */}
        <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col gap-5 shrink-0 h-full">
          {/* Filters & Search */}
          <div className="space-y-4">
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Поиск по имени или телефону..."
                  className="pl-11 h-12 bg-white border-zinc-200/80 rounded-2xl shadow-sm focus-visible:ring-blue-500 font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                <FilterPill mode="all" label="Все" count={leads.length} />
                <FilterPill mode="new" label="Новые" count={leads.filter(l => l.status === 'new').length} />
                <FilterPill mode="in_progress" label="В работе" />
                <FilterPill mode="no_answer" label="Недозвон" />
             </div>
          </div>

          {/* List Area */}
          <div className="flex-1 min-h-0 bg-transparent rounded-3xl overflow-hidden mt-2">
             {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
                </div>
             ) : (
                <LeadList
                  leads={filteredLeads}
                  selectedLeadId={selectedLeadId}
                  onSelect={(lead) => setSelectedLeadId(lead.id || null)}
                />
             )}
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="flex-1 min-h-0 hidden lg:block h-full relative">
          {selectedLead ? (
            <LeadDetails lead={selectedLead} onClose={() => setSelectedLeadId(null)} />
          ) : (
            <div className="h-full border-2 border-dashed border-zinc-200/80 rounded-[2rem] bg-zinc-50/50 flex flex-col items-center justify-center text-zinc-400">
              <Inbox className="w-16 h-16 mb-4 text-zinc-300" />
              <p className="text-xl font-bold text-zinc-700">Выберите лид для просмотра</p>
              <p className="text-sm font-medium mt-2">Вся детальная информация и редактирование будут доступны здесь</p>
            </div>
          )}
        </div>

        {/* Mobile Details Overlay */}
        {selectedLead && (
          <div className="fixed inset-0 z-50 bg-zinc-50 lg:hidden flex flex-col animate-in slide-in-from-bottom-full">
             <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-white shadow-sm z-20">
                <button
                   onClick={() => setSelectedLeadId(null)}
                   className="font-semibold text-zinc-600 px-5 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
                >
                  Назад к списку
                </button>
             </div>
             <div className="flex-1 overflow-y-auto bg-zinc-50">
                <LeadDetails lead={selectedLead} onClose={() => setSelectedLeadId(null)} />
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
