"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { CatalogCar } from "@/lib/types";
import { carTitle } from "@/lib/leads/match";
import { cn } from "@/lib/utils";
import { AdsScroller } from "@/components/ads/chrome";

export function CarPicker({
  cars,
  selectedIds,
  onPick,
  onClose,
}: {
  cars: CatalogCar[];
  selectedIds: string[];
  onPick: (car: CatalogCar) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [showSold, setShowSold] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return cars.filter((c) => {
      if (!showSold && c.isSold) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        String(c.year || "").includes(q) ||
        String(c.priceUsd).includes(q)
      );
    });
  }, [cars, query, showSold]);

  return (
    <div className="absolute inset-0 z-[80] flex flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-leads-line px-4 py-3">
        <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-full text-leads-muted hover:bg-zinc-100">
          <X className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2">
          <Search className="size-4 text-leads-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Марка, модель, год"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-leads-subtle"
          />
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-2">
        <p className="text-xs text-leads-muted">{filtered.length} авто</p>
        <button
          type="button"
          onClick={() => setShowSold((v) => !v)}
          className={cn("text-xs font-medium", showSold ? "text-leads-ink" : "text-leads-muted")}
        >
          {showSold ? "Скрыть проданные" : "Показать проданные"}
        </button>
      </div>
      <AdsScroller className="min-h-0 flex-1" contentClassName="px-3 pb-8">
        {filtered.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-leads-muted">Ничего не нашлось</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((car) => {
              const on = selectedIds.includes(car.id);
              return (
                <button
                  key={car.id}
                  type="button"
                  onClick={() => onPick(car)}
                  className={cn(
                    "flex gap-3 rounded-2xl bg-white p-2 text-left ring-1",
                    on ? "ring-zinc-900" : "ring-leads-line hover:bg-zinc-50",
                  )}
                >
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                    {car.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={car.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 py-0.5">
                    <p className="truncate text-[13px] font-semibold text-leads-ink">{carTitle(car)}</p>
                    <p className="mt-0.5 text-[12px] text-leads-muted">
                      {car.priceUsd ? `${car.priceUsd.toLocaleString("ru-RU")} $` : "без цены"}
                      {car.isSold ? " · продана" : ""}
                    </p>
                    {on ? <p className="mt-1 text-[10px] font-medium text-leads-subtle">Уже привязана</p> : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </AdsScroller>
    </div>
  );
}

export function CarChip({
  car,
  primary,
  onPrimary,
  onRemove,
}: {
  car: CatalogCar;
  primary?: boolean;
  onPrimary?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white p-2 ring-1 ring-leads-line">
      <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
        {car.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={car.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-leads-ink">{carTitle(car)}</p>
        <p className="text-[11px] text-leads-muted">
          {car.priceUsd ? `${car.priceUsd.toLocaleString("ru-RU")} $` : ""}
          {primary ? " · основная" : ""}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {!primary && onPrimary ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onPrimary(); }} className="text-[10px] font-medium text-leads-muted hover:text-leads-ink">
            Основная
          </button>
        ) : null}
        {onRemove ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-[10px] font-medium text-leads-muted hover:text-red-600">
            Убрать
          </button>
        ) : null}
      </div>
    </div>
  );
}
