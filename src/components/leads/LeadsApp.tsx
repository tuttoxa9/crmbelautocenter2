"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { startOfDay } from "date-fns";
import type { CatalogCar, Lead } from "@/lib/types";
import { getLeads, getPaginatedLeads, subscribeToActiveLeads } from "@/lib/leadService";
import { leadCarIds, leadMatchesQuery } from "@/lib/leads/match";
import { loadCatalogCars } from "@/lib/catalog";
import { CenterNote, InlineNotice, LeadSkeleton } from "./chrome";
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

function carText(lead: Lead, cars: CatalogCar[]) {
  const linked = leadCarIds(lead)
    .map((id) => cars.find((car) => car.id === id))
    .filter((car): car is CatalogCar => Boolean(car))
    .map((car) => `${car.name} ${car.make} ${car.model} ${car.year ?? ""}`)
    .join(" ");
  return `${lead.car || ""} ${linked}`.toLowerCase();
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
  const [archive, setArchive] = useState<Lead[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [archiveError, setArchiveError] = useState(false);
  const [feedReady, setFeedReady] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [feedNonce, setFeedNonce] = useState(0);
  const [catalogNonce, setCatalogNonce] = useState(0);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    setMode(readMode());
    setTab(readTab());
  }, []);

  useEffect(() => {
    const unsub = subscribeToActiveLeads((rows) => {
      setFeedReady(true);
      setFeedError(false);
      setLeads(rows);
      setSelected((prev) => {
        if (!prev?.id) return prev;
        return rows.find((l) => l.id === prev.id) || prev;
      });
    }, () => setFeedError(true));
    return unsub;
  }, [feedNonce]);

  useEffect(() => {
    let cancel = false;
    setCatalogError(false);
    void loadCatalogCars({ includeSold: true }).then((loaded) => {
      if (cancel) return;
      setCatalogReady(true);
      if (!loaded.ok) {
        setCatalogError(true);
        return;
      }
      setCars(loaded.cars);
      setCatalogError(false);
    });
    return () => {
      cancel = true;
    };
  }, [catalogNonce]);

  const query = search.trim();

  const wantArchive = Boolean(query || selected || addOpen);

  const loadArchive = useCallback(() => {
    setSearchLoading(true);
    setArchiveError(false);
    return getLeads()
      .then((rows) => {
        setArchive(rows);
        setArchiveError(false);
      })
      .catch(() => {
        setArchiveError(true);
      })
      .finally(() => setSearchLoading(false));
  }, []);

  useEffect(() => {
    if (!wantArchive || archive || searchLoading || archiveError) return;
    void loadArchive();
  }, [wantArchive, archive, searchLoading, archiveError, loadArchive]);

  const searchPool = useMemo(() => {
    if (!archive) return leads;
    const map = new Map<string, Lead>();
    for (const lead of archive) {
      if (lead.id) map.set(lead.id, lead);
    }
    for (const lead of leads) {
      if (lead.id) map.set(lead.id, lead);
    }
    return Array.from(map.values());
  }, [archive, leads]);

  const searchRows = useMemo(() => {
    if (!query) return [];
    return searchPool
      .filter((lead) => leadMatchesQuery(lead, query) || carText(lead, cars).includes(query.toLowerCase()))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [searchPool, query, cars]);

  const setModePersist = (next: Mode) => {
    setMode(next);
    window.localStorage.setItem("leads.mode", next);
    if (next !== "auto") setDossier(null);
  };

  const setTabPersist = (next: DayTab) => {
    setTab(next);
    setMobileMenu(false);
    setSelected(null);
    window.localStorage.setItem("leads.tab", next);
  };

  const loadHistory = useCallback(async (more = false) => {
    if (historyLoading || (more && !hasMore)) return;
    setHistoryLoading(true);
    try {
      const { leads: rows, lastDoc } = await getPaginatedLeads(50, more ? historyLast : null);
      setHistoryError(false);
      setHistory((prev) => (more ? [...prev, ...rows] : rows));
      setHistoryLast(lastDoc as QueryDocumentSnapshot<DocumentData, DocumentData> | null);
      setHasMore(rows.length === 50);
    } catch {
      setHistoryError(true);
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

  const baseRows = history;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") {
        if (addOpen || selected) return;
        if (dossier) setDossier(null);
      }
      if (e.key === "/" ) {
        e.preventDefault();
        document.getElementById("leads-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, dossier, addOpen]);

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
    const scroll = () => {
      document.querySelector(`[data-lead-id="${highlightId}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    const first = window.setTimeout(scroll, 80);
    const again = window.setTimeout(scroll, 500);
    const clear = window.setTimeout(() => setHighlightId(null), 2400);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(again);
      window.clearTimeout(clear);
    };
  }, [highlightId, tab, mode, filterDate]);

  return (
    <div className="leads-os ads-os flex h-full min-h-0 flex-col bg-leads-bg text-leads-ink">
      <header className="flex flex-col gap-3 border-b border-leads-line px-3 py-3 md:flex-row md:items-center md:px-5">
        <div className="flex items-center gap-1">
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
                "rounded-xl px-3.5 py-2 text-[13px] font-medium",
                mode === id ? "bg-leads-paper text-leads-paper-ink" : "text-leads-muted hover:text-leads-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-leads-card px-3 py-2 ring-1 ring-leads-line">
          <Search className="size-4 text-leads-subtle" />
          <input
            id="leads-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.trim()) setMobileMenu(false);
            }}
            placeholder="Имя, телефон или авто"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-leads-subtle"
          />
          {search ? (
            <button type="button" onClick={() => setSearch("")} className="text-[13px] text-leads-muted" aria-label="Очистить поиск">
              ×
            </button>
          ) : null}
        </div>

        {mode === "day" && tab !== "new" && !query ? <DateStepper value={filterDate} onChange={setFilterDate} /> : null}

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="hidden h-10 items-center justify-center rounded-xl bg-leads-paper px-4 text-[13px] font-medium text-leads-paper-ink md:flex"
        >
          Клиент
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {mode === "day" ? (
          <>
            <aside
              className={cn(
                "w-full shrink-0 flex-col border-r border-leads-line md:flex md:w-[240px]",
                mobileMenu ? "flex" : "hidden md:flex",
              )}
            >
              <div className="p-3 md:hidden">
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="flex h-10 w-full items-center justify-center rounded-xl bg-leads-paper text-[13px] font-medium text-leads-paper-ink"
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
                      "flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-[15px]",
                      tab === t.id ? "bg-leads-raised font-medium text-leads-ink" : "text-leads-muted hover:bg-white/[0.04] hover:text-leads-ink",
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
              {feedError ? <InlineNotice text="Заявки не обновляются" onRetry={() => setFeedNonce((n) => n + 1)} /> : null}
              {query ? (
                <LeadSearchResults
                  rows={searchRows}
                  loading={searchLoading && !archive}
                  failed={archiveError}
                  onRetry={() => void loadArchive()}
                  cars={cars}
                  selectedId={selected?.id}
                  highlightId={highlightId}
                  onOpen={setSelected}
                  onOpenCar={openCar}
                />
              ) : !feedReady && !feedError ? (
                <div className="divide-y divide-leads-line bg-leads-card md:mx-3 md:mt-3 md:rounded-2xl md:ring-1 md:ring-leads-line">
                  {Array.from({ length: 6 }, (_, i) => <LeadSkeleton key={i} />)}
                </div>
              ) : (
                <DayBoard
                  leads={leads}
                  cars={cars}
                  tab={tab}
                  filterDate={filterDate}
                  search=""
                  selectedId={selected?.id}
                  highlightId={highlightId}
                  onOpen={setSelected}
                  onOpenCar={openCar}
                />
              )}
            </div>
          </>
        ) : null}

        {mode === "auto" ? (
          <div className="min-w-0 flex-1">
            <AutoBoard
              cars={cars}
              leads={query ? searchPool : leads}
              search={search}
              selectedLeadId={selected?.id}
              dossierCar={dossier}
              catalogLoading={!catalogReady && !catalogError}
              catalogError={catalogError && cars.length === 0}
              onRetryCatalog={() => {
                setCatalogReady(false);
                setCatalogNonce((n) => n + 1);
              }}
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
            {query ? (
              <LeadSearchResults
                rows={searchRows}
                loading={searchLoading && !archive}
                failed={archiveError}
                onRetry={() => void loadArchive()}
                cars={cars}
                selectedId={selected?.id}
                highlightId={highlightId}
                onOpen={setSelected}
                onOpenCar={openCar}
              />
            ) : (
            <AdsScroller className="h-full" contentClassName="pb-24">
              {historyError && history.length === 0 ? (
                <CenterNote text="Базу открыть не удалось" action={{ label: "Повторить", onClick: () => void loadHistory() }} />
              ) : historyLoading && history.length === 0 ? (
                <div className="divide-y divide-leads-line bg-leads-card md:mx-3 md:mt-3 md:rounded-2xl md:ring-1 md:ring-leads-line">
                  {Array.from({ length: 6 }, (_, i) => <LeadSkeleton key={i} />)}
                </div>
              ) : (
              <div className="divide-y divide-leads-line bg-leads-card md:mx-3 md:mt-3 md:rounded-2xl md:ring-1 md:ring-leads-line">
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
              )}
              {historyError && history.length > 0 ? (
                <InlineNotice text="Дальше прочитать не удалось" onRetry={() => void loadHistory(true)} />
              ) : null}
              {historyLoading && history.length > 0 ? (
                <div className="divide-y divide-leads-line">
                  {Array.from({ length: 3 }, (_, i) => <LeadSkeleton key={i} />)}
                </div>
              ) : null}
              {hasMore && !historyError ? (
                <div className="p-4 text-center">
                  <button
                    type="button"
                    onClick={() => void loadHistory(true)}
                    disabled={historyLoading}
                    className="rounded-xl px-4 py-2 text-[13px] font-medium ring-1 ring-leads-line disabled:opacity-45"
                  >
                    Ещё
                  </button>
                </div>
              ) : null}
            </AdsScroller>
            )}
          </div>
        ) : null}
      </div>

      <div className="fixed right-4 bottom-4 z-20 md:hidden">
        {mode !== "day" || !mobileMenu ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-12 items-center justify-center rounded-xl bg-leads-paper px-5 text-[13px] font-medium text-leads-paper-ink shadow-lg"
          >
            Клиент
          </button>
        ) : null}
      </div>

      <QuickAddLead
        cars={cars}
        allLeads={archive ? searchPool : [...leads, ...history]}
        presetCar={presetCar}
        open={addOpen}
        hideTrigger
        catalogError={catalogError && cars.length === 0}
        catalogLoading={!catalogReady && !catalogError}
        onRetryCatalog={() => {
          setCatalogReady(false);
          setCatalogNonce((n) => n + 1);
        }}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) setPresetCar(null);
        }}
        onSuccess={() => {
          setPresetCar(null);
          setAddOpen(false);
        }}
        archiveFailed={archiveError}
        onOpenDuplicate={revealLead}
        onCreated={(lead) => {
          setPresetCar(null);
          setAddOpen(false);
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
            setHighlightId(lead.id || null);
            return;
          }
          revealLead(lead);
        }}
      />

      {selected ? (
        <LeadFocusView
          lead={selected}
          cars={cars}
          allLeads={archive ? searchPool : [...leads, ...history]}
          archiveFailed={archiveError}
          catalogError={catalogError && cars.length === 0}
          catalogLoading={!catalogReady && !catalogError}
          onRetryCatalog={() => {
            setCatalogReady(false);
            setCatalogNonce((n) => n + 1);
          }}
          onClose={() => setSelected(null)}
          onOpenCar={openCar}
          onDeleted={() => setSelected(null)}
          onOpenDuplicate={revealLead}
          onUpdated={setSelected}
        />
      ) : null}
    </div>
  );
}

function LeadSearchResults({
  rows,
  loading,
  failed,
  onRetry,
  cars,
  selectedId,
  highlightId,
  onOpen,
  onOpenCar,
}: {
  rows: Lead[];
  loading: boolean;
  failed?: boolean;
  onRetry: () => void;
  cars: CatalogCar[];
  selectedId?: string | null;
  highlightId?: string | null;
  onOpen: (lead: Lead) => void;
  onOpenCar: (car: CatalogCar) => void;
}) {
  if (loading && rows.length === 0) {
    return (
      <div className="divide-y divide-leads-line bg-leads-card md:mx-3 md:mt-3 md:rounded-2xl md:ring-1 md:ring-leads-line">
        {Array.from({ length: 6 }, (_, i) => <LeadSkeleton key={i} />)}
      </div>
    );
  }
  if (!loading && rows.length === 0) {
    return <CenterNote text="Ничего не нашлось" />;
  }

  return (
    <AdsScroller className="h-full" contentClassName="pb-24">
      {failed ? <InlineNotice text="Всю базу прочитать не удалось" onRetry={onRetry} /> : null}
      <p className="px-4 py-3 text-[12px] font-medium text-leads-muted md:px-5">
        Вся база <span className="text-leads-subtle">{rows.length}</span>
        {loading ? " · Проверяем всю базу" : ""}
      </p>
      <div className="divide-y divide-leads-line bg-leads-card md:mx-3 md:rounded-2xl md:ring-1 md:ring-leads-line">
        {rows.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            cars={cars}
            selected={selectedId === lead.id}
            highlight={highlightId === lead.id}
            showFullDate
            onOpen={() => onOpen(lead)}
            onOpenCar={onOpenCar}
          />
        ))}
      </div>
    </AdsScroller>
  );
}
