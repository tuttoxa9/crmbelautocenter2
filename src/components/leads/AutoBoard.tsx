"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus, X } from "lucide-react";
import type { CatalogCar, Lead, LeadStatus } from "@/lib/types";
import { carTitle, isActiveStatus, leadMatchesCar, TERMINAL_STATUSES } from "@/lib/leads/match";
import { getLeadsByCarId } from "@/lib/leadService";
import { getStatusLabel } from "@/lib/displayUtils";
import { LeadRow } from "./views/LeadFocusView";
import { AdsScroller } from "@/components/ads/chrome";
import { cn } from "@/lib/utils";

type CarFilter = "active" | "all" | "sold";
type DossierTab = "active" | "visit" | "calls" | "history";

function statsFor(car: CatalogCar, leads: Lead[]) {
  const linked = leads.filter((l) => leadMatchesCar(l, car));
  const active = linked.filter((l) => isActiveStatus(l.status));
  const visits = active.filter((l) => l.status === "visit").length;
  const calls = active.filter((l) => l.status === "callback" || l.status === "no_answer").length;
  return { linked, active, visits, calls };
}

export function AutoBoard({
  cars,
  leads,
  search,
  selectedLeadId,
  dossierCar,
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
  onOpenLead: (lead: Lead) => void;
  onOpenCar: (car: CatalogCar) => void;
  onCloseCar: () => void;
  onAddForCar: (car: CatalogCar) => void;
}) {
  const [filter, setFilter] = useState<CarFilter>("active");

  const cards = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = cars
      .map((car) => ({ car, ...statsFor(car, leads) }))
      .filter((row) => {
        if (filter === "sold") return row.car.isSold;
        if (filter === "active") return !row.car.isSold && row.active.length > 0;
        return !row.car.isSold;
      })
      .filter((row) => {
        if (!q) return true;
        return (
          row.car.name.toLowerCase().includes(q) ||
          String(row.car.year || "").includes(q) ||
          row.linked.some(
            (l) => l.name?.toLowerCase().includes(q) || l.phone?.includes(q),
          )
        );
      })
      .sort((a, b) => b.active.length - a.active.length);
    return rows;
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-black">
      <div className="flex gap-1 px-4 py-2">
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
            onClick={() => setFilter(id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-medium",
              filter === id ? "bg-white text-black" : "text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <AdsScroller className="min-h-0 flex-1" contentClassName="px-3 pb-24">
        {cards.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-zinc-500">
            {filter === "active" ? "Пока никто не привязан к авто" : "Пусто"}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(({ car, active, visits, calls }) => (
              <button
                key={car.id}
                type="button"
                onClick={() => onOpenCar(car)}
                className="overflow-hidden rounded-3xl bg-[#141416] text-left ring-1 ring-white/10 hover:ring-white/25"
              >
                <div className="aspect-[16/9] bg-[#1c1c1f]">
                  {car.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={car.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="truncate text-[14px] font-semibold text-zinc-100">{carTitle(car)}</p>
                  <p className="mt-0.5 text-[12px] text-zinc-400">
                    {car.priceUsd ? `${car.priceUsd.toLocaleString("ru-RU")} $` : "без цены"}
                    {car.isSold ? " · продана" : ""}
                  </p>
                  <p className="mt-2 text-[12px] text-zinc-300">
                    {active.length} {active.length === 1 ? "клиент" : "клиентов"}
                    {visits ? ` · ${visits} приезда` : ""}
                    {calls ? ` · ${calls} звонка` : ""}
                  </p>
                </div>
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

  useEffect(() => {
    let alive = true;
    void getLeadsByCarId(car.id).then((rows) => {
      if (alive) setHistory(rows);
    });
    return () => {
      alive = false;
    };
  }, [car.id]);

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

  const rows = lists[tab].sort((a, b) => (b.nextActionDate || b.createdAt) - (a.nextActionDate || a.createdAt));

  return (
    <div className="flex h-full min-h-0 flex-col bg-black">
      <div className="flex items-start gap-3 border-b border-white/10 px-4 py-3">
        <button type="button" onClick={onClose} className="mt-1 flex size-9 items-center justify-center rounded-full text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100">
          <X className="size-4" />
        </button>
        <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-[#1c1c1f]">
          {car.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={car.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold text-zinc-100">{carTitle(car)}</p>
          <p className="text-[13px] text-zinc-400">
            {car.priceUsd ? `${car.priceUsd.toLocaleString("ru-RU")} $` : "без цены"}
            {car.mileage ? ` · ${car.mileage.toLocaleString("ru-RU")} км` : ""}
            {car.isSold ? " · продана" : ""}
          </p>
          <a
            href={`https://belautocenter.by/catalog/${car.id}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-[11px] text-zinc-500 hover:text-zinc-100"
          >
            Открыть на сайте
          </a>
        </div>
        <button type="button" onClick={onAdd} className="flex h-10 items-center gap-1 rounded-full bg-white px-3 text-[12px] font-semibold text-black">
          <Plus className="size-3.5" /> Клиент
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto px-4 py-2">
        {(
          [
            ["active", `Активные ${lists.active.length}`],
            ["visit", `Приезды ${lists.visit.length}`],
            ["calls", `Звонки ${lists.calls.length}`],
            ["history", `История ${lists.history.length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium",
              tab === id ? "bg-white text-black" : "text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <AdsScroller className="min-h-0 flex-1" contentClassName="pb-24">
        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-zinc-500">Пока никого</p>
        ) : (
          <div className="divide-y divide-white/10 bg-[#141416] md:mx-3 md:rounded-2xl md:ring-1 md:ring-white/10">
            {rows.map((lead) => (
              <div key={lead.id}>
                <LeadRow
                  lead={lead}
                  cars={[car]}
                  selected={selectedLeadId === lead.id}
                  onOpen={() => onOpenLead(lead)}
                />
                {lead.nextActionDate ? (
                  <p className="-mt-2 mb-2 px-12 text-[11px] text-zinc-500">
                    {getStatusLabel(lead.status)} · {format(lead.nextActionDate, "d MMM, HH:mm", { locale: ru })}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </AdsScroller>
    </div>
  );
}
