"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { CatalogCar } from "@/lib/types";
import { carTitle } from "@/lib/leads/match";
import { cn } from "@/lib/utils";
import { AdsScroller } from "@/components/ads/chrome";
import { CarPhoto, CenterNote } from "./chrome";

export function CarPicker({
  cars,
  selectedIds,
  catalogError,
  catalogLoading,
  onRetry,
  onPick,
  onClose,
}: {
  cars: CatalogCar[];
  selectedIds: string[];
  catalogError?: boolean;
  catalogLoading?: boolean;
  onRetry?: () => void;
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
      const blob = `${c.name} ${c.make} ${c.model} ${c.year ?? ""} ${c.priceUsd || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [cars, query, showSold]);

  const inStock = cars.some((c) => !c.isSold);
  const emptyText = query.trim() ? "Такой машины нет" : !showSold && !inStock ? "В наличии ничего нет" : "Такой машины нет";

  return (
    <div className="absolute inset-0 z-[80] flex flex-col bg-leads-raised text-leads-ink">
      <div className="flex items-center gap-2 border-b border-leads-line px-4 py-3">
        <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-xl text-leads-muted hover:bg-white/[0.06] hover:text-leads-ink" aria-label="Закрыть">
          <X className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-leads-card px-3 py-2 ring-1 ring-leads-line">
          <Search className="size-4 text-leads-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Марка, модель, год"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-leads-ink outline-none placeholder:text-leads-subtle"
          />
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-2">
        <p className="text-[13px] text-leads-subtle">{filtered.length}</p>
        <button
          type="button"
          onClick={() => setShowSold((v) => !v)}
          className={cn("text-[13px] font-medium", showSold ? "text-leads-ink" : "text-leads-muted")}
        >
          {showSold ? "Скрыть проданные" : "Показать проданные"}
        </button>
      </div>
      <AdsScroller className="min-h-0 flex-1" contentClassName="px-3 pb-8">
        {catalogError ? (
          <CenterNote text="Склад не открылся" action={{ label: "Повторить", onClick: () => onRetry?.() }} />
        ) : catalogLoading && cars.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-leads-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <CenterNote text={emptyText} />
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
                    "flex gap-3 rounded-2xl p-2 text-left ring-1 ring-leads-line",
                    on ? "bg-leads-card" : "hover:bg-white/[0.04]",
                  )}
                >
                  <span className="size-16 shrink-0 overflow-hidden rounded-xl">
                    <CarPhoto name={car.make || car.name} photoUrl={car.photoUrl} className="size-16" />
                  </span>
                  <span className="min-w-0 py-0.5">
                    <span className="block truncate text-[14px] font-semibold text-leads-ink">{carTitle(car)}</span>
                    <span className="mt-0.5 block text-[13px] text-leads-muted tabular-nums">
                      {car.priceUsd ? `${car.priceUsd.toLocaleString("ru-RU")} $` : ""}
                      {car.isSold ? " · Продана" : ""}
                    </span>
                    {on ? <span className="mt-1 block text-[12px] text-leads-subtle">Уже привязана</span> : null}
                  </span>
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
    <div className="flex items-center gap-2 rounded-2xl bg-leads-card p-2 ring-1 ring-leads-line">
      <span className="size-12 shrink-0 overflow-hidden rounded-xl">
        <CarPhoto name={car.make || car.name} photoUrl={car.photoUrl} className="size-12" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-leads-ink">{carTitle(car)}</p>
        <p className="text-[13px] text-leads-muted tabular-nums">
          {car.priceUsd ? `${car.priceUsd.toLocaleString("ru-RU")} $` : ""}
          {primary ? " · Основная" : ""}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {!primary && onPrimary ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onPrimary(); }} className="text-[12px] font-medium text-leads-muted hover:text-leads-ink">
            Сделать основной
          </button>
        ) : null}
        {onRemove ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-[12px] font-medium text-leads-muted hover:text-leads-danger">
            Убрать
          </button>
        ) : null}
      </div>
    </div>
  );
}
