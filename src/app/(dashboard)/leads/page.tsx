"use client";

import { useEffect, useState, useMemo } from "react";
import { subscribeToLeads } from "@/lib/leadService";
import { Lead } from "@/lib/types";
import { Search, Inbox, LayoutGrid, Clock } from "lucide-react";
import { useDebounce } from "use-debounce";
import { LeadDataGrid } from "@/components/leads/views/LeadDataGrid";
import { LeadFocusView } from "@/components/leads/views/LeadFocusView";
import { QuickAddLead } from "@/components/leads/ui/QuickAddLead";

type FilterTab = "inbox" | "active" | "scheduled" | "all";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [activeTab, setActiveTab] = useState<FilterTab>("active");

  useEffect(() => {
    // Fetch active leads. Avoid subscribing to all terminal statuses (like 'success', 'refusal', 'spam') to avoid unbounded memory leaks on large histories.
    // The main leads workspace is for active pipeline management. The 'Database Table' view is for the full historical archive.
    const activeStatuses: import("@/lib/types").LeadStatus[] = [
      "new", "in_progress", "visit", "no_answer", "thinking", "callback"
    ];

    const unsubscribe = subscribeToLeads((fetchedLeads) => {
      setLeads(fetchedLeads);
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
      // 1. Tab Filter
      if (activeTab === "inbox" && lead.status !== "new") return false;
      if (activeTab === "active" && !["in_progress", "thinking", "callback", "no_answer", "new"].includes(lead.status)) return false;
      if (activeTab === "scheduled" && lead.status !== "visit") return false;

      // 2. Search Filter
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase();
        const match = lead.name?.toLowerCase().includes(query) || lead.phone?.toLowerCase().includes(query) || lead.car?.toLowerCase().includes(query);
        if (!match) return false;
      }
      return true;
    });
  }, [leads, debouncedSearchQuery, activeTab]);

  const counts = {
    inbox: leads.filter(l => l.status === "new").length,
    active: leads.filter(l => ["in_progress", "thinking", "callback", "no_answer", "new"].includes(l.status)).length,
    scheduled: leads.filter(l => l.status === "visit").length,
    all: leads.length
  };

  return (
    <div className="h-full flex bg-[#F4F5F7] text-zinc-900 font-sans overflow-hidden">

      {/* Left Sidebar - Inner Navigation */}
      <div className="w-64 bg-zinc-50 border-r border-zinc-200 flex flex-col relative z-10 shrink-0">
        <div className="p-4 relative">
          <QuickAddLead />
        </div>

        <div className="px-3 pb-2 pt-2">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-2">Фильтры</div>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${activeTab === 'inbox' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-zinc-600 hover:bg-zinc-100 font-medium'}`}
            >
              <span className="flex items-center gap-2"><Inbox className="w-4 h-4" /> Новые</span>
              {counts.inbox > 0 && <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs font-bold">{counts.inbox}</span>}
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${activeTab === 'active' ? 'bg-zinc-200/50 text-zinc-900 font-semibold' : 'text-zinc-600 hover:bg-zinc-100 font-medium'}`}
            >
              <span className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> В работе</span>
              <span className="text-zinc-500 text-xs font-bold">{counts.active}</span>
            </button>
            <button
              onClick={() => setActiveTab("scheduled")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${activeTab === 'scheduled' ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-zinc-600 hover:bg-zinc-100 font-medium'}`}
            >
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Запланировано</span>
              <span className="text-zinc-500 text-xs font-bold">{counts.scheduled}</span>
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors mt-4 ${activeTab === 'all' ? 'bg-zinc-200/50 text-zinc-900 font-semibold' : 'text-zinc-600 hover:bg-zinc-100 font-medium'}`}
            >
              <span className="flex items-center gap-2"><LayoutGrid className="w-4 h-4 opacity-50" /> Вся база</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-[#FBFBFC]">
        {/* Top Search Bar */}
        <div className="h-14 border-b border-zinc-200 flex items-center px-6 bg-white shrink-0">
          <div className="flex-1 flex items-center gap-3">
            <Search className="w-4 h-4 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени, номеру, авто..."
              className="w-full h-full bg-transparent border-none outline-none text-sm placeholder:text-zinc-400 font-medium"
            />
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <LeadDataGrid
            leads={filteredLeads}
            selectedLeadId={selectedLead?.id || null}
            onSelectLead={setSelectedLead}
            dateFilterKey={activeTab === "scheduled" ? "nextActionDate" : "createdAt"}
          />
        </div>

        {/* Focus View Overlay */}
        {selectedLead && (
          <LeadFocusView lead={selectedLead} onClose={() => setSelectedLead(null)} />
        )}

      </div>
    </div>
  );
}
