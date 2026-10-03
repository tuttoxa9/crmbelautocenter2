"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { X } from "lucide-react";
import type { CatalogCar, Lead, LeadStatus } from "@/lib/types";
import { carTitle, isActiveStatus, leadMatchesCar, leadMatchesQuery, TERMINAL_STATUSES } from "@/lib/leads/match";
import { getLeadsByCarId } from "@/lib/leadService";
import { getStatusLabel } from "@/lib/displayUtils";
import { LeadRow } from "./views/LeadFocusView";
import { AdsScroller } from "@/components/ads/chrome";
import { CarCardSkeleton, CarPhoto, CenterNote, InlineNotice, LeadSkeleton } from "./chrome";
import { cn } from "@/lib/utils";

type CarFilter = "active" | "all" | "sold";
type DossierTab = "active" | "visit" | "calls" | "history";

let rememberedFilter: CarFilter = "active";

function ruWord(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function statsFor(car: CatalogCar, leads: Lead[]) {
  const linked = leads.filter((l) => leadMatchesCar(l, car));
  const active = linked.filter((l) => isActiveStatus(l.status));
  const visits = active.filter((l) => l.status === "visit").length;
  const calls = active.filter((l) => l.status === "callback" || l.status === "no_answer").length;
  return { linked, active, visits, calls };
}

function carMatches(car: CatalogCar, q: string) {
  if (!q) return true;
  const blob = `${car.name} ${car.make} ${car.model} ${car.year ?? ""} ${car.priceUsd || ""}`.toLowerCase();
  return blob.includes(q);
}

export function AutoBoard({
  cars,
  leads,
  search,
  selectedLeadId,
  dossierCar,
  catalogLoading,
  catalogError,
  onRetryCatalog,
  onOpenLead,
  onOpenCar,
  onCloseCar,
  onAddForCar,
}: {
  cars: CatalogCar[];
  leads: Lead[];
  search: string;
  selectedLeadId?: string | null;
  dossierCar: CatalogCar | null;
  catalogLoading?: boolean;
  catalogError?: boolean;
  onRetryCatalog?: () => void;
  onOpenLead: (lead: Lead) => void;
  onOpenCar: (car: CatalogCar) => void;
  onCloseCar: () => void;
  onAddForCar: (car: CatalogCar) => void;
}) {
  const [filter, setFilter] = useState<CarFilter>(rememberedFilter);
  const chooseFilter = (next: CarFilter) => {
    rememberedFilter = next;
    setFilter(next);
  };

  const cards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cars
      .map((car) => ({ car, ...statsFor(car, leads) }))
      .filter((row) => {
        const matchesQuery = !q || carMatches(row.car, q) || row.linked.some((l) => leadMatchesQuery(l, q));
        if (!matchesQuery) return false;
        if (filter === "sold") return row.car.isSold;
        if (filter === "all") return !row.car.isSold;
        if (q) return !row.car.isSold;
        return !row.car.isSold && row.active.length > 0;
      })
      .sort((a, b) => b.active.length - a.active.length || carTitle(a.car).localeCompare(carTitle(b.car), "ru"));
  }, [cars, leads, filter, search]);

  if (dossierCar) {
    return (
      <CarDossier
        car={dossierCar}
        liveLeads={leads}
        selectedLeadId={selectedLeadId}
        onOpenLead={onOpenLead}
        onClose={onCloseCar}
        onAdd={() => onAddForCar(dossierCar)}
      />
    );
  }

  const empty =
    search.trim()
      ? "Такой машины нет"
      : filter === "active"
        ? "Нет машин с открытыми клиентами"
        : filter === "sold"
          ? "Проданных машин нет"
          : "На складе нет машин в наличии";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 px-5 py-3 md:px-7">
        {(
          [
            ["active", "С клиентами"],
            ["all", "Весь склад"],
            ["sold", "Проданные"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => chooseFilter(id)}
            className={cn(
              "rounded-xl px-3 py-2 text-[13px] font-medium",
              filter === id ? "bg-leads-paper text-leads-paper-ink" : "text-leads-muted hover:text-leads-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <AdsScroller className="min-h-0 flex-1" contentClassName="px-5 pb-24 md:px-7">
        {catalogError ? (
          <CenterNote text="Склад не открылся" action={{ label: "Повторить", onClick: () => onRetryCatalog?.() }} />
        ) : catalogLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => <CarCardSkeleton key={i} />)}
          </div>
        ) : cards.length === 0 ? (
          <CenterNote text={empty} />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map(({ car, active, visits, calls }) => (
              <button
                key={car.id}
                type="button"
                onClick={() => onOpenCar(car)}
                className="overflow-hidden rounded-2xl bg-leads-card text-left ring-1 ring-leads-line hover:bg-white/[0.03]"
              >
                <span className="block aspect-[16/10] bg-leads-photo">
                  <CarPhoto name={car.make || car.name} photoUrl={car.photoUrl} className="h-full w-full" />
                </span>
                <span className="block p-4">
                  <span className="block truncate text-[16px] font-semibold text-leads-ink">{carTitle(car)}</span>
                  <span className="mt-1 block text-[14px] text-leads-muted tabular-nums">
                    {[
                      car.priceUsd ? `${car.priceUsd.toLocaleString("ru-RU")} $` : "",
                      car.mileage ? `${car.mileage.toLocaleString("ru-RU")} км` : "",
                    ].filter(Boolean).join(" · ")}
                  </span>
                  {car.isSold ? <span className="mt-1 block text-[13px] text-leads-subtle">Продана</span> : null}
                  <span className="mt-2 block text-[13px] text-leads-ink">
                    {active.length} {ruWord(active.length, "клиент", "клиента", "клиентов")}
                    {visits ? ` · ${visits} ${ruWord(visits, "приезд", "приезда", "приездов")}` : ""}
                    {calls ? ` · ${calls} ${ruWord(calls, "звонок", "звонка", "звонков")}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </AdsScroller>
    </div>
  );
}

function CarDossier({
  car,
  liveLeads,
  selectedLeadId,
  onOpenLead,
  onClose,
  onAdd,
}: {
  car: CatalogCar;
  liveLeads: Lead[];
  selectedLeadId?: string | null;
  onOpenLead: (lead: Lead) => void;
  onClose: () => void;
  onAdd: () => void;
}) {
  const [history, setHistory] = useState<Lead[]>([]);
  const [tab, setTab] = useState<DossierTab>("active");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    void getLeadsByCarId(car.id)
      .then((rows) => {
        if (alive) setHistory(rows);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [car.id, tick]);

  const merged = useMemo(() => {
    const map = new Map<string, Lead>();
    for (const l of [...liveLeads.filter((x) => leadMatchesCar(x, car)), ...history]) {
      if (l.id) map.set(l.id, l);
    }
    return [...map.values()];
  }, [liveLeads, history, car]);

  const lists: Record<DossierTab, Lead[]> = {
    active: merged.filter((l) => isActiveStatus(l.status)),
    visit: merged.filter((l) => l.status === "visit"),
    calls: merged.filter((l) => l.status === "callback" || l.status === "no_answer"),
    history: merged.filter((l) => TERMINAL_STATUSES.includes(l.status as LeadStatus)),
  };

  const rows = [...lists[tab]].sort((a, b) => (b.nextActionDate || b.createdAt) - (a.nextActionDate || a.createdAt));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-3 border-b border-leads-line px-5 py-4 md:px-7">
        <button type="button" onClick={onClose} className="mt-1 flex size-9 items-center justify-center rounded-xl text-leads-muted hover:bg-white/[0.06] hover:text-leads-ink" aria-label="Закрыть">
          <X className="size-4" />
        </button>
        <span className="size-24 shrink-0 overflow-hidden rounded-2xl">
          <CarPhoto name={car.make || car.name} photoUrl={car.photoUrl} className="size-24" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[22px] font-semibold text-leads-ink">{carTitle(car)}</p>
          <p className="mt-1 text-[14px] text-leads-muted tabular-nums">
            {[
              car.priceUsd ? `${car.priceUsd.toLocaleString("ru-RU")} $` : "",
              car.mileage ? `${car.mileage.toLocaleString("ru-RU")} км` : "",
            ].filter(Boolean).join(" · ")}
          </p>
          {car.isSold ? <p className="mt-1 text-[13px] text-leads-subtle">Продана</p> : null}
          <a
            href={`https://belautocenter.by/catalog/${car.id}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-[13px] text-leads-muted hover:text-leads-ink"
          >
            На сайте
          </a>
        </div>
        <button type="button" onClick={onAdd} className="flex h-10 shrink-0 items-center rounded-xl bg-leads-paper px-4 text-[13px] font-medium text-leads-paper-ink">
          Клиент
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto px-5 py-3 md:px-7">
        {(
          [
            ["active", "Активные"],
            ["visit", "Приезды"],
            ["calls", "Звонки"],
            ["history", "История"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2 text-[13px] font-medium",
              tab === id ? "bg-leads-raised text-leads-ink" : "text-leads-muted hover:text-leads-ink",
            )}
          >
            {label} {lists[id].length}
          </button>
        ))}
      </div>

      {failed ? (
        <InlineNotice text="Закрытые заявки по этой машине не загрузились" onRetry={() => setTick((n) => n + 1)} />
      ) : null}

      <AdsScroller className="min-h-0 flex-1" contentClassName="pb-24">
        {loading ? (
          <div className="divide-y divide-leads-line bg-leads-card md:mx-5 md:rounded-2xl md:ring-1 md:ring-leads-line">
            {Array.from({ length: 3 }, (_, i) => <LeadSkeleton key={i} />)}
          </div>
        ) : null}
        {!loading && rows.length === 0 ? <CenterNote text="В этой вкладке никого" /> : null}
        {rows.length > 0 ? (
          <div className="divide-y divide-leads-line bg-leads-card md:mx-5 md:mt-3 md:rounded-2xl md:ring-1 md:ring-leads-line">
            {rows.map((lead) => (
              <div key={lead.id}>
                <LeadRow
                  lead={lead}
                  cars={[car]}
                  selected={selectedLeadId === lead.id}
                  onOpen={() => onOpenLead(lead)}
                />
                {lead.nextActionDate ? (
                  <p className="-mt-1 mb-2 px-5 text-[13px] text-leads-subtle md:px-6">
                    {getStatusLabel(lead.status)} · {format(lead.nextActionDate, "d MMM, HH:mm", { locale: ru })}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </AdsScroller>
    </div>
  );
}
