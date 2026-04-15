"use client";

import { useEffect, useState, useMemo } from "react";
import { subscribeToLeads } from "@/lib/leadService";
import { Lead } from "@/lib/types";
import { Search, Inbox, LayoutGrid, Clock, PhoneOff, CalendarDays, BrainCircuit, PhoneForwarded, ChevronLeft, ChevronRight } from "lucide-react";
import { useDebounce } from "use-debounce";
import { LeadDataGrid } from "@/components/leads/views/LeadDataGrid";
import { LeadFocusView } from "@/components/leads/views/LeadFocusView";
import { QuickAddLead } from "@/components/leads/ui/QuickAddLead";
import { getPaginatedLeads } from "@/lib/leadService";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { format, addDays, subDays, startOfDay, isToday, isSameDay, isBefore, isAfter } from "date-fns";
import { ru } from "date-fns/locale";

type FilterTab = "new" | "in_progress" | "visit" | "no_answer" | "thinking" | "callback" | "all";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [activeTab, setActiveTab] = useState<FilterTab>("in_progress");
  const [filterDate, setFilterDate] = useState<Date>(startOfDay(new Date()));

  // History Pagination State
  const [historyLeads, setHistoryLeads] = useState<Lead[]>([]);
  const [historyLastDoc, setHistoryLastDoc] = useState<QueryDocumentSnapshot<DocumentData, DocumentData> | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // Active leads subscription
  useEffect(() => {
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

  // History fetch logic
  const loadHistory = async (isLoadMore = false) => {
    if (isHistoryLoading || (!hasMoreHistory && isLoadMore)) return;
    setIsHistoryLoading(true);

    try {
      const { leads: newLeads, lastDoc } = await getPaginatedLeads(
        50,
        isLoadMore ? historyLastDoc : null
      );

      setHistoryLeads(prev => isLoadMore ? [...prev, ...newLeads] : newLeads);
      setHistoryLastDoc(lastDoc as QueryDocumentSnapshot<DocumentData, DocumentData> | null);
      setHasMoreHistory(newLeads.length === 50);
    } catch (error) {
      console.error("Failed to load history leads", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "all" && historyLeads.length === 0) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filteredLeads = useMemo(() => {
    const sourceLeads = activeTab === "all" ? historyLeads : leads;

    // We only apply strict date filtering on the active/working tabs (not "all" history usually, but user asked for date filter across table)
    const isDateFilteredTab = activeTab !== "all" && activeTab !== "new";

    return sourceLeads.filter(lead => {
      // 1. Tab Filter
      if (activeTab !== "all" && lead.status !== activeTab) return false;

      // 2. Search Filter
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase();
        const match = lead.name?.toLowerCase().includes(query) || lead.phone?.toLowerCase().includes(query) || lead.car?.toLowerCase().includes(query);
        if (!match) return false;
      }

      // 3. Date Filter (Strict Logic per User Request)
      if (isDateFilteredTab && filterDate) {
        const leadDate = lead.nextActionDate ? startOfDay(new Date(lead.nextActionDate)) : startOfDay(new Date(lead.createdAt));
        const targetDate = startOfDay(filterDate);

        if (isToday(targetDate)) {
           // If "Today" is selected, show everything due Today AND past due (earlier than today)
           if (isAfter(leadDate, targetDate)) return false;
        } else {
           // If any other specific day is selected, show EXACTLY that day
           if (!isSameDay(leadDate, targetDate)) return false;
        }
      }

      return true;
    });
  }, [leads, historyLeads, debouncedSearchQuery, activeTab, filterDate]);

  // Date Stepper Handlers
  const handlePrevDay = () => setFilterDate(prev => subDays(prev, 1));
  const handleNextDay = () => setFilterDate(prev => addDays(prev, 1));
  const handleResetToToday = () => setFilterDate(startOfDay(new Date()));

  const counts = {
    new: leads.filter(l => l.status === "new").length,
    in_progress: leads.filter(l => l.status === "in_progress").length,
    visit: leads.filter(l => l.status === "visit").length,
    no_answer: leads.filter(l => l.status === "no_answer").length,
    thinking: leads.filter(l => l.status === "thinking").length,
    callback: leads.filter(l => l.status === "callback").length,
  };

  // The user explicitly requested to always group by nextActionDate across the table for active tabs,
  // so that tasks/leads don't get lost. We only fall back to createdAt for the "new" tab.
  const isDateTab = activeTab !== "new";

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
              onClick={() => { setActiveTab("new"); setSelectedLead(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${activeTab === 'new' ? 'bg-red-50 text-red-700 font-semibold' : 'text-zinc-600 hover:bg-zinc-100 font-medium'}`}
            >
              <span className="flex items-center gap-2"><Inbox className="w-4 h-4" /> Новые</span>
              {counts.new > 0 && <span className="bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-xs font-bold">{counts.new}</span>}
            </button>
            <button
              onClick={() => { setActiveTab("in_progress"); setSelectedLead(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${activeTab === 'in_progress' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-zinc-600 hover:bg-zinc-100 font-medium'}`}
            >
              <span className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> В работе</span>
              {counts.in_progress > 0 && <span className="text-zinc-500 text-xs font-bold">{counts.in_progress}</span>}
            </button>
            <button
              onClick={() => { setActiveTab("visit"); setSelectedLead(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${activeTab === 'visit' ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-zinc-600 hover:bg-zinc-100 font-medium'}`}
            >
              <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Приезд</span>
              {counts.visit > 0 && <span className="text-zinc-500 text-xs font-bold">{counts.visit}</span>}
            </button>
            <button
              onClick={() => { setActiveTab("callback"); setSelectedLead(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${activeTab === 'callback' ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-zinc-600 hover:bg-zinc-100 font-medium'}`}
            >
              <span className="flex items-center gap-2"><PhoneForwarded className="w-4 h-4" /> Перезвонить</span>
              {counts.callback > 0 && <span className="text-zinc-500 text-xs font-bold">{counts.callback}</span>}
            </button>
            <button
              onClick={() => { setActiveTab("no_answer"); setSelectedLead(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${activeTab === 'no_answer' ? 'bg-zinc-200/50 text-zinc-900 font-semibold' : 'text-zinc-600 hover:bg-zinc-100 font-medium'}`}
            >
              <span className="flex items-center gap-2"><PhoneOff className="w-4 h-4" /> Недозвон</span>
              {counts.no_answer > 0 && <span className="text-zinc-500 text-xs font-bold">{counts.no_answer}</span>}
            </button>
            <button
              onClick={() => { setActiveTab("thinking"); setSelectedLead(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${activeTab === 'thinking' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-zinc-600 hover:bg-zinc-100 font-medium'}`}
            >
              <span className="flex items-center gap-2"><BrainCircuit className="w-4 h-4" /> Думает</span>
              {counts.thinking > 0 && <span className="text-zinc-500 text-xs font-bold">{counts.thinking}</span>}
            </button>

            <div className="pt-4 mt-4 border-t border-zinc-200">
              <button
                onClick={() => { setActiveTab("all"); setSelectedLead(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${activeTab === 'all' ? 'bg-zinc-200/50 text-zinc-900 font-semibold' : 'text-zinc-600 hover:bg-zinc-100 font-medium'}`}
              >
                <span className="flex items-center gap-2"><LayoutGrid className="w-4 h-4 opacity-50" /> Вся база</span>
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-[#FBFBFC]">
        {/* Top Search Bar & Filters */}
        <div className="h-14 border-b border-zinc-200 flex items-center px-6 bg-white shrink-0 justify-between">
          <div className="flex-1 flex items-center gap-3">
            <Search className="w-4 h-4 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени, номеру, авто..."
              className="w-full h-full bg-transparent border-none outline-none text-sm placeholder:text-zinc-400 font-medium"
            />
          </div>
          {activeTab !== "all" && activeTab !== "new" && (
            <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-md p-1">
              <button
                onClick={handlePrevDay}
                className="p-1.5 hover:bg-zinc-200 text-zinc-600 rounded transition-colors"
                title="Предыдущий день"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetToToday}
                className={`px-3 py-1.5 text-sm font-medium min-w-[100px] text-center rounded transition-colors ${isToday(filterDate) ? 'text-blue-700 bg-blue-100/50' : 'text-zinc-700 hover:bg-zinc-200'}`}
              >
                {isToday(filterDate) ? "Сегодня" : format(filterDate, "d MMM, EEE", { locale: ru })}
              </button>

              <button
                onClick={handleNextDay}
                className="p-1.5 hover:bg-zinc-200 text-zinc-600 rounded transition-colors"
                title="Следующий день"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Data Grid */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <LeadDataGrid
            leads={filteredLeads}
            selectedLeadId={selectedLead?.id || null}
            onSelectLead={setSelectedLead}
            dateFilterKey={isDateTab ? "nextActionDate" : "createdAt"}
            isHistoryTab={activeTab === "all"}
            hasMoreHistory={hasMoreHistory}
            isHistoryLoading={isHistoryLoading}
            onLoadMore={() => loadHistory(true)}
            targetDate={filterDate}
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
