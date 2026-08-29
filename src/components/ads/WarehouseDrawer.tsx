"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { type AdCampaignType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CarThumb } from "./CarThumb";
import { AdsScroller, CloseBtn, Overlay, Spinner } from "./chrome";

export interface WarehouseCar {
  id: string;
  name: string;
  year?: string | number;
  priceUsd: number;
  photoUrl?: string;
}

export function WarehouseDrawer({
  open,
  onClose,
  warehouse,
  addingId,
  suggestedAir,
  onAdd,
  onManual,
}: {
  open: boolean;
  onClose: () => void;
  warehouse: WarehouseCar[];
  addingId: string | null;
  suggestedAir?: AdCampaignType;
  onAdd: (car: WarehouseCar, campaign: AdCampaignType) => void;
  onManual?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [dest, setDest] = useState<AdCampaignType>("waiting_video");

  const list = useMemo(() => {
    const q = query.toLowerCase().trim();
    return warehouse.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        String(c.year || "").includes(q) ||
        String(c.priceUsd).includes(q)
      );
    });
  }, [warehouse, query]);

  return (
    <Overlay open={open} onClose={onClose} align="end">
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Склад"
        className="ads-sheet relative flex h-full w-full flex-col bg-ads-bg shadow-ads-float"
      >
        <header className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ads-ink">Склад</h2>
            <p className="text-xs text-ads-muted">{warehouse.length} свободных авто</p>
          </div>
          <CloseBtn onClick={onClose} />
        </header>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ads-subtle" />
            <input
              autoFocus
              type="text"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              className="h-10 w-full rounded-xl bg-ads-surface pr-3 pl-9 text-sm text-ads-ink outline-none placeholder:text-ads-subtle focus:bg-ads-card focus:ring-2 focus:ring-ads-accent/25"
            />
          </div>
          <p className="mt-3 mb-1.5 text-xs font-medium text-ads-muted">Куда поставить</p>
          <div className="grid grid-cols-3 gap-0.5 rounded-xl bg-ads-surface p-0.5">
            {(
              [
                ["waiting_video", "Съёмка"],
                ["rk1", "РК 1"],
                ["rk2", "РК 2"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDest(id)}
                className={cn(
                  "h-8 rounded-lg text-xs font-medium transition-colors",
                  dest === id ? "bg-ads-card text-ads-ink shadow-ads-pill" : "text-ads-muted hover:text-ads-ink",
                )}
              >
                {label}
                {suggestedAir === id ? " · меньше" : ""}
              </button>
            ))}
          </div>
        </div>

        <AdsScroller className="min-h-0 flex-1" viewportClassName="px-3 pb-8">
          {list.length === 0 ? (
            <p className="px-2 py-10 text-center text-sm text-ads-subtle">Ничего не найдено</p>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-ads-card">
              {list.map((car, i) => {
                const busy = addingId === car.id;
                return (
                  <div
                    key={car.id}
                    className={cn("flex items-center gap-3 px-3 py-2.5", i > 0 && "border-t border-ads-line")}
                  >
                    <CarThumb name={car.name} photoUrl={car.photoUrl} className="h-9 w-12" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ads-ink">{car.name}</p>
                      <p className="text-xs text-ads-muted">
                        {car.year ? `${car.year} · ` : ""}${Number(car.priceUsd).toLocaleString("ru-RU")}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!!addingId}
                      onClick={() => onAdd(car, dest)}
                      className="inline-flex h-8 items-center rounded-lg bg-ads-ink px-3 text-xs font-medium text-ads-paper disabled:opacity-40"
                    >
                      {busy ? <Spinner /> : "Взять"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {onManual && (
            <button
              type="button"
              onClick={onManual}
              className="mt-3 w-full rounded-xl py-2.5 text-center text-xs font-medium text-ads-muted hover:text-ads-ink"
            >
              Добавить вручную
            </button>
          )}
        </AdsScroller>
      </aside>
    </Overlay>
  );
}
