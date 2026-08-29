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
    <div className="absolute inset-0 z-[80] flex flex-col bg-black text-zinc-100">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-full text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100">
          <X className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#141416] px-3 py-2 ring-1 ring-white/10">
          <Search className="size-4 text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Марка, модель, год"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-zinc-100 outline-none placeholder:text-zinc-500"
          />
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-2">
        <p className="text-xs text-zinc-500">{filtered.length} авто</p>
        <button
          type="button"
          onClick={() => setShowSold((v) => !v)}
          className={cn("text-xs font-medium", showSold ? "text-zinc-100" : "text-zinc-500")}
        >
          {showSold ? "Скрыть проданные" : "Показать проданные"}
        </button>
      </div>
      <AdsScroller className="min-h-0 flex-1" contentClassName="px-3 pb-8">
        {filtered.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-zinc-500">Ничего не нашлось</p>
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
                    "flex gap-3 rounded-2xl bg-[#141416] p-2 text-left ring-1",
                    on ? "ring-white" : "ring-white/10 hover:bg-white/[0.04] hover:ring-white/20",
                  )}
                >
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-[#1c1c1f]">
                    {car.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={car.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 py-0.5">
                    <p className="truncate text-[13px] font-semibold text-zinc-100">{carTitle(car)}</p>
                    <p className="mt-0.5 text-[12px] text-zinc-400">
                      {car.priceUsd ? `${car.priceUsd.toLocaleString("ru-RU")} $` : "без цены"}
                      {car.isSold ? " · продана" : ""}
                    </p>
                    {on ? <p className="mt-1 text-[10px] font-medium text-zinc-500">Уже привязана</p> : null}
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
    <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] p-2 ring-1 ring-white/10">
      <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-[#1c1c1f]">
        {car.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={car.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-zinc-100">{carTitle(car)}</p>
        <p className="text-[11px] text-zinc-400">
          {car.priceUsd ? `${car.priceUsd.toLocaleString("ru-RU")} $` : ""}
          {primary ? " · основная" : ""}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {!primary && onPrimary ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onPrimary(); }} className="text-[10px] font-medium text-zinc-500 hover:text-zinc-100">
            Основная
          </button>
        ) : null}
        {onRemove ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-[10px] font-medium text-zinc-500 hover:text-red-400">
            Убрать
          </button>
        ) : null}
      </div>
    </div>
  );
}
