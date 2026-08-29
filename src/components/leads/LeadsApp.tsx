"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { startOfDay } from "date-fns";
import type { CatalogCar, Lead } from "@/lib/types";
import { getPaginatedLeads, subscribeToActiveLeads } from "@/lib/leadService";
import { fetchCatalogCars } from "@/lib/catalog";
import { DateStepper } from "./DateControls";
import { DayBoard, DAY_TABS, type DayTab } from "./DayBoard";
import { AutoBoard } from "./AutoBoard";
import { LeadFocusView, LeadRow } from "./views/LeadFocusView";
import { QuickAddLead } from "./ui/QuickAddLead";
import { AdsScroller } from "@/components/ads/chrome";
import { cn } from "@/lib/utils";

type Mode = "day" | "auto" | "base";

function readMode(): Mode {
  if (typeof window === "undefined") return "day";
  const v = window.localStorage.getItem("leads.mode");
  return v === "auto" || v === "base" ? v : "day";
}

function readTab(): DayTab {
  if (typeof window === "undefined") return "in_progress";
  const v = window.localStorage.getItem("leads.tab");
  return DAY_TABS.some((t) => t.id === v) ? (v as DayTab) : "in_progress";
}

export function LeadsApp() {
  const [mode, setMode] = useState<Mode>("day");
  const [tab, setTab] = useState<DayTab>("in_progress");
  const [filterDate, setFilterDate] = useState(() => startOfDay(new Date()));
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cars, setCars] = useState<CatalogCar[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [dossier, setDossier] = useState<CatalogCar | null>(null);
  const [mobileMenu, setMobileMenu] = useState(true);
  const [history, setHistory] = useState<Lead[]>([]);
  const [historyLast, setHistoryLast] = useState<QueryDocumentSnapshot<DocumentData, DocumentData> | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [presetCar, setPresetCar] = useState<CatalogCar | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    setMode(readMode());
    setTab(readTab());
  }, []);

  useEffect(() => {
    const unsub = subscribeToActiveLeads((rows) => {
      setLeads(rows);
      setSelected((prev) => {
        if (!prev?.id) return prev;
        return rows.find((l) => l.id === prev.id) || prev;
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    void fetchCatalogCars({ includeSold: true }).then(setCars);
  }, []);

  const setModePersist = (next: Mode) => {
    setMode(next);
    setSearch("");
    window.localStorage.setItem("leads.mode", next);
    if (next !== "auto") setDossier(null);
  };

  const setTabPersist = (next: DayTab) => {
    setTab(next);
    setMobileMenu(false);
    setSelected(null);
    setSearch("");
    window.localStorage.setItem("leads.tab", next);
  };

  const loadHistory = useCallback(async (more = false) => {
    if (historyLoading || (more && !hasMore)) return;
    setHistoryLoading(true);
    try {
      const { leads: rows, lastDoc } = await getPaginatedLeads(50, more ? historyLast : null);
      setHistory((prev) => (more ? [...prev, ...rows] : rows));
      setHistoryLast(lastDoc as QueryDocumentSnapshot<DocumentData, DocumentData> | null);
      setHasMore(rows.length === 50);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyLoading, hasMore, historyLast]);

  useEffect(() => {
    if (mode === "base" && history.length === 0) void loadHistory();
  }, [mode, history.length, loadHistory]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of DAY_TABS) c[t.id] = leads.filter((l) => l.status === t.id).length;
    return c;
  }, [leads]);

  const baseRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (l) =>
        l.name?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.car?.toLowerCase().includes(q) ||
        l.notes?.toLowerCase().includes(q),
    );
  }, [history, search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") {
        if (selected) setSelected(null);
        else if (dossier) setDossier(null);
      }
      if (e.key === "/" ) {
        e.preventDefault();
        document.getElementById("leads-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, dossier]);

  const openCar = (car: CatalogCar) => {
    setModePersist("auto");
    setDossier(car);
    setSearch("");
  };

  const revealLead = (lead: Lead) => {
    setAddOpen(false);
    setPresetCar(null);
    setDossier(null);
    const tabId = DAY_TABS.some((t) => t.id === lead.status) ? (lead.status as DayTab) : null;
    if (tabId) {
      setMode("day");
      setTab(tabId);
      setMobileMenu(false);
      setSearch("");
      window.localStorage.setItem("leads.mode", "day");
      window.localStorage.setItem("leads.tab", tabId);
      if (tabId !== "new") {
        const raw = lead.nextActionDate || lead.createdAt;
        const due = startOfDay(new Date(raw));
        const today = startOfDay(new Date());
        setFilterDate(due.getTime() < today.getTime() ? today : due);
      }
    } else {
      setMode("base");
      window.localStorage.setItem("leads.mode", "base");
      setSearch(lead.phone || "");
    }
    setSelected(lead);
    setHighlightId(lead.id || null);
  };

  useEffect(() => {
    if (!highlightId) return;
    const scroll = window.setTimeout(() => {
      document.querySelector(`[data-lead-id="${highlightId}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 80);
    const clear = window.setTimeout(() => setHighlightId(null), 3200);
    return () => {
      window.clearTimeout(scroll);
      window.clearTimeout(clear);
    };
  }, [highlightId, tab, mode, filterDate]);

  return (
    <div className="leads-os ads-os flex h-full min-h-0 flex-col bg-leads-bg text-leads-ink">
      <header className="flex flex-col gap-3 border-b border-leads-line px-3 py-3 md:flex-row md:items-center md:px-5">
        <div className="flex items-center gap-1 rounded-full bg-[#141416] p-0.5 ring-1 ring-leads-line">
          {([
            ["day", "День"],
            ["auto", "Авто"],
            ["base", "База"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setModePersist(id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-semibold",
                mode === id ? "bg-white text-black" : "text-leads-muted hover:text-leads-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#141416] px-3 py-2 ring-1 ring-leads-line">
          <Search className="size-4 text-leads-subtle" />
          <input
            id="leads-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={mode === "auto" ? "Марка, клиент, телефон" : "Имя, телефон, авто"}
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-leads-subtle"
          />
        </div>

        {mode === "day" && tab !== "new" ? <DateStepper value={filterDate} onChange={setFilterDate} /> : null}

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="hidden h-10 items-center justify-center rounded-full bg-white px-4 text-[13px] font-semibold text-black md:flex"
        >
          Клиент
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {mode === "day" ? (
          <>
            <aside
              className={cn(
                "w-full shrink-0 flex-col border-r border-leads-line md:flex md:w-[220px]",
                mobileMenu ? "flex" : "hidden md:flex",
              )}
            >
              <div className="p-3 md:hidden">
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="flex h-10 w-full items-center justify-center rounded-full bg-white text-[13px] font-semibold text-black"
                >
                  Клиент
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
                {DAY_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTabPersist(t.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] md:py-1.5 md:text-[13px]",
                      tab === t.id ? "bg-white text-black font-semibold" : "text-leads-muted hover:bg-white/[0.08] hover:text-leads-ink",
                    )}
                  >
                    <span>{t.label}</span>
                    {counts[t.id] ? <span className="text-[11px] text-leads-subtle">{counts[t.id]}</span> : null}
                  </button>
                ))}
              </nav>
            </aside>
            <div className={cn("min-w-0 flex-1", mobileMenu ? "hidden md:block" : "block")}>
              <div className="flex items-center gap-2 px-3 py-2 md:hidden">
                <button type="button" onClick={() => setMobileMenu(true)} className="text-[13px] font-medium text-leads-muted">
                  Статусы
                </button>
              </div>
              <DayBoard
                leads={leads}
                cars={cars}
                tab={tab}
                filterDate={filterDate}
                search={search}
                selectedId={selected?.id}
                highlightId={highlightId}
                onOpen={setSelected}
                onOpenCar={openCar}
              />
            </div>
          </>
        ) : null}

        {mode === "auto" ? (
          <div className="min-w-0 flex-1">
            <AutoBoard
              cars={cars}
              leads={leads}
              search={search}
              selectedLeadId={selected?.id}
              dossierCar={dossier}
              onOpenLead={setSelected}
              onOpenCar={setDossier}
              onCloseCar={() => setDossier(null)}
              onAddForCar={(car) => {
                setPresetCar(car);
                setAddOpen(true);
              }}
            />
          </div>
        ) : null}

        {mode === "base" ? (
          <div className="min-w-0 flex-1">
            <AdsScroller className="h-full" contentClassName="pb-24">
              <div className="divide-y divide-leads-line bg-[#141416] md:mx-3 md:mt-3 md:rounded-2xl md:ring-1 md:ring-leads-line">
                {baseRows.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    cars={cars}
                    selected={selected?.id === lead.id}
                    highlight={highlightId === lead.id}
                    onOpen={() => setSelected(lead)}
                    onOpenCar={openCar}
                  />
                ))}
              </div>
              {hasMore ? (
                <div className="p-4 text-center">
                  <button
                    type="button"
                    onClick={() => void loadHistory(true)}
                    disabled={historyLoading}
                    className="rounded-full px-4 py-2 text-[13px] font-medium ring-1 ring-leads-line"
                  >
                    {historyLoading ? "Загрузка…" : "Ещё"}
                  </button>
                </div>
              ) : null}
            </AdsScroller>
          </div>
        ) : null}
      </div>

      <div className="fixed right-4 bottom-4 z-20 md:hidden">
        {mode !== "day" || !mobileMenu ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-12 items-center justify-center rounded-full bg-white px-5 text-[13px] font-semibold text-black shadow-lg"
          >
            Клиент
          </button>
        ) : null}
      </div>

      <QuickAddLead
        cars={cars}
        allLeads={leads}
        presetCar={presetCar}
        open={addOpen}
        hideTrigger
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) setPresetCar(null);
        }}
        onSuccess={() => {
          setPresetCar(null);
          setAddOpen(false);
        }}
        onOpenDuplicate={revealLead}
      />

      {selected ? (
        <LeadFocusView
          lead={selected}
          cars={cars}
          allLeads={[...leads, ...history]}
          onClose={() => setSelected(null)}
          onOpenCar={openCar}
          onDeleted={() => setSelected(null)}
          onOpenDuplicate={revealLead}
        />
      ) : null}
    </div>
  );
}
