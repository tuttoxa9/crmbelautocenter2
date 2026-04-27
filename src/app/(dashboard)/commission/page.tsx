"use client";

import { useEffect, useState, useMemo } from "react";
import { subscribeToCommissions, getPaginatedCommissions } from "@/lib/services/commission";
import { Lead } from "@/lib/types";
import { Search, Inbox, LayoutGrid, Clock, PhoneOff, CalendarDays, BrainCircuit, PhoneForwarded, ChevronLeft, ChevronRight } from "lucide-react";
import { useDebounce } from "use-debounce";
import { CommissionDataGrid } from "@/components/commission/views/CommissionDataGrid";
import { CommissionFocusView } from "@/components/commission/views/CommissionFocusView";
import { QuickAddCommission } from "@/components/commission/ui/QuickAddCommission";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { format, addDays, subDays, startOfDay, isToday, isSameDay, isBefore, isAfter } from "date-fns";
import { ru } from "date-fns/locale";

type FilterTab = "visit" | "thinking" | "callback" | "refusal" | "all";
export default function CommissionPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [activeTab, setActiveTab] = useState<FilterTab>("visit");
  const [filterDate, setFilterDate] = useState<Date>(startOfDay(new Date()));
  const [mobileView, setMobileView] = useState<"menu" | "list">("menu");

  const [historyLeads, setHistoryLeads] = useState<Lead[]>([]);
  const [historyLastDoc, setHistoryLastDoc] = useState<QueryDocumentSnapshot<DocumentData, DocumentData> | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  useEffect(() => {
    const activeStatuses: import("@/lib/types").LeadStatus[] = [
      "visit", "thinking", "callback", "refusal"
    ];

    const unsubscribe = subscribeToCommissions((fetchedLeads) => {
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

  const loadHistory = async (isLoadMore = false) => {
    if (isHistoryLoading || (!hasMoreHistory && isLoadMore)) return;
    setIsHistoryLoading(true);

    try {
      const { leads: newLeads, lastDoc } = await getPaginatedCommissions(
        50,
        isLoadMore ? historyLastDoc : null
      );

      setHistoryLeads(prev => isLoadMore ? [...prev, ...newLeads] : newLeads);
      setHistoryLastDoc(lastDoc as QueryDocumentSnapshot<DocumentData, DocumentData> | null);
      setHasMoreHistory(newLeads.length === 50);
    } catch (error) {
      console.error("Failed to load history commissions", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "all" && historyLeads.length === 0) {
      loadHistory();
    }
  }, [activeTab]);

  const filteredLeads = useMemo(() => {
    const sourceLeads = activeTab === "all" ? historyLeads : leads;
    const isDateFilteredTab = activeTab !== "all" && activeTab !== "refusal";

    return sourceLeads.filter(lead => {
      if (activeTab !== "all" && lead.status !== activeTab) return false;

      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase();
        const match = lead.name?.toLowerCase().includes(query) || lead.phone?.toLowerCase().includes(query) || lead.car?.toLowerCase().includes(query);
        if (!match) return false;
      }

      if (isDateFilteredTab && filterDate) {
        const leadDate = lead.nextActionDate ? startOfDay(new Date(lead.nextActionDate)) : startOfDay(new Date(lead.createdAt));
        const targetDate = startOfDay(filterDate);

        if (isToday(targetDate)) {
           if (isAfter(leadDate, targetDate)) return false;
        } else {
           if (!isSameDay(leadDate, targetDate)) return false;
        }
      }

      return true;
    });
  }, [leads, historyLeads, debouncedSearchQuery, activeTab, filterDate]);

  const handlePrevDay = () => setFilterDate(prev => subDays(prev, 1));
  const handleNextDay = () => setFilterDate(prev => addDays(prev, 1));
  const handleResetToToday = () => setFilterDate(startOfDay(new Date()));

  const counts = {
    visit: leads.filter(l => l.status === "visit").length,
    thinking: leads.filter(l => l.status === "thinking").length,
    callback: leads.filter(l => l.status === "callback").length,
    refusal: leads.filter(l => l.status === "refusal").length,
  };

  const isDateTab = activeTab !== "refusal" && activeTab !== "all";

  return (
    <div className="h-full bg-zinc-950 text-zinc-900 font-sans overflow-hidden relative">
      <div className={`absolute inset-0 flex flex-col md:flex-row bg-[#FAFAFA] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] origin-center z-10 ${selectedLead ? 'md:scale-[0.95] md:rounded-[32px] md:opacity-40 md:shadow-2xl md:overflow-hidden pointer-events-none' : ''}`}>

      <div className={`w-full md:w-[240px] bg-[#FAFAFA] border-b md:border-b-0 md:border-r border-zinc-200/60 relative shrink-0 ${mobileView === 'menu' ? 'flex flex-col flex-1 md:flex-none' : 'hidden md:flex md:flex-col md:flex-none'}`}>
        <div className="p-4 md:p-3 relative">
          <QuickAddCommission />
        </div>

        <div className="px-0 md:px-3 pb-2 pt-0 flex flex-col flex-1 min-h-0">
          <div className="hidden md:block text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-2">Фильтры</div>
          <nav className="flex flex-col gap-2 md:gap-0.5 overflow-y-auto px-4 md:px-0 pb-6 md:pb-0 scrollbar-hide">
            {[
              { id: "visit", label: "Приезд", icon: CalendarDays, count: counts.visit },
              { id: "callback", label: "Перезвон", icon: PhoneForwarded, count: counts.callback },
              { id: "thinking", label: "Думает", icon: BrainCircuit, count: counts.thinking },
              { id: "refusal", label: "Отказ", icon: PhoneOff, count: counts.refusal },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as FilterTab); setSelectedLead(null); setMobileView("list"); }}
                className={`w-full flex items-center justify-between px-4 md:px-3 py-3 md:py-1.5 rounded-2xl md:rounded-lg text-[15px] md:text-[13px] transition-all border md:border-transparent ${activeTab === tab.id ? 'bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] border-zinc-200/50 text-zinc-900 font-semibold' : 'bg-transparent text-zinc-500 md:hover:bg-zinc-200/50 md:hover:text-zinc-800 font-medium'}`}
              >
                <span className="flex items-center gap-3 md:gap-2"><tab.icon className={`w-5 h-5 md:w-3.5 md:h-3.5 ${activeTab === tab.id ? 'opacity-100 text-zinc-800' : 'opacity-60'}`} /> {tab.label}</span>
                {tab.count > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-[10px] font-bold ${activeTab === tab.id ? 'bg-zinc-100 text-zinc-800' : 'text-zinc-400'}`}>{tab.count}</span>}
              </button>
            ))}

            <div className="w-full md:pt-4 md:mt-2 md:border-t md:border-zinc-200/60 flex items-center pb-12 md:pb-0">
              <button
                onClick={() => { setActiveTab("all"); setSelectedLead(null); setMobileView("list"); }}
                className={`w-full flex items-center justify-between px-4 md:px-3 py-3 md:py-1.5 rounded-2xl md:rounded-lg text-[15px] md:text-[13px] transition-all border md:border-transparent ${activeTab === 'all' ? 'bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] border-zinc-200/50 text-zinc-900 font-semibold' : 'bg-transparent text-zinc-500 md:hover:bg-zinc-200/50 md:hover:text-zinc-800 font-medium'}`}
              >
                <span className="flex items-center gap-3 md:gap-2"><LayoutGrid className="w-5 h-5 md:w-3.5 md:h-3.5 opacity-50" /> Вся база</span>
              </button>
            </div>
          </nav>
        </div>
      </div>

      <div className={`flex-1 relative min-w-0 bg-[#FBFBFC] ${mobileView === 'list' || selectedLead ? 'flex flex-col animate-in slide-in-from-right-8 fade-in-0 duration-300 md:animate-none' : 'hidden md:flex flex-col'}`}>
        <div className="min-h-14 py-2 border-b border-zinc-200 flex flex-col sm:flex-row items-center px-4 md:px-6 bg-white shrink-0 gap-3 justify-between sticky top-0 z-10 md:static p-3 md:p-3 shadow-sm md:shadow-none">
          <div className="w-full sm:flex-1 flex items-center gap-3">
            <button 
              onClick={() => setMobileView("menu")}
              className="md:hidden flex items-center gap-1 text-zinc-500 hover:text-zinc-900 pr-2 border-r border-zinc-200 shrink-0"
            >
              <ChevronLeft className="w-6 h-6 -ml-1 -my-1" />
              <span className="text-sm font-medium mr-1">Статусы</span>
            </button>
            <div className="flex-1 flex items-center gap-2 bg-zinc-50 sm:bg-transparent p-2.5 sm:p-0 rounded-lg border border-zinc-200 sm:border-none">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени, номеру, авто..."
                className="w-full bg-transparent border-none outline-none text-[15px] sm:text-sm placeholder:text-zinc-400 font-medium"
              />
            </div>
          </div>
          {activeTab !== "all" && activeTab !== "new" && (
            <div className="w-full sm:w-auto flex items-center justify-center gap-1 bg-zinc-50 border border-zinc-200 rounded-md p-1 shrink-0">
              <button
                onClick={handlePrevDay}
                className="p-1.5 hover:bg-zinc-200 text-zinc-600 rounded transition-colors"
                title="Предыдущий день"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetToToday}
                className={`px-3 py-1.5 text-sm font-medium flex-1 sm:min-w-[100px] text-center rounded transition-colors ${isToday(filterDate) ? 'text-blue-700 bg-blue-100/50' : 'text-zinc-700 hover:bg-zinc-200'}`}
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

        <div className="flex-1 p-2 md:p-6 relative">
          <CommissionDataGrid
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

      </div>

      </div>

      {selectedLead && (
        <CommissionFocusView lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}

    </div>
  );
}
