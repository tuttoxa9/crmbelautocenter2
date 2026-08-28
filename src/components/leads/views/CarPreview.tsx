"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Image as ImageIcon, Gauge, Calendar } from "lucide-react";
import { fetchCatalogCar } from "@/lib/catalog";
import type { CatalogCar } from "@/lib/types";

interface CarPreviewProps {
  carId?: string;
  url?: string;
}

export function CarPreview({ carId, url }: CarPreviewProps) {
  const [car, setCar] = useState<CatalogCar | null>(null);
  const [loading, setLoading] = useState(true);
  const extractedId = carId || (url && url.includes("/catalog/") ? url.split("/catalog/")[1]?.split("?")[0] : null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!extractedId) {
        setLoading(false);
        return;
      }
      const row = await fetchCatalogCar(extractedId);
      if (alive) {
        setCar(row);
        setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [extractedId]);

  if (!extractedId) return null;

  if (loading) {
    return (
      <div className="mt-8 animate-pulse border-t border-zinc-200/60 pt-6">
        <div className="mb-4 h-4 w-32 rounded bg-zinc-200" />
        <div className="h-24 w-full rounded-xl bg-zinc-100" />
      </div>
    );
  }

  const href = url || `https://belautocenter.by/catalog/${extractedId}`;

  if (!car) {
    return (
      <div className="mt-8 border-t border-zinc-200/60 pt-6">
        <a href={href} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
          {href}
        </a>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-zinc-200/60 pt-6">
      <h3 className="mb-3 text-xs font-bold tracking-wider text-zinc-500 uppercase">Заинтересовавший авто</h3>
      <a href={href} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex h-24">
          <div className="flex w-1/3 shrink-0 items-center justify-center overflow-hidden bg-zinc-100">
            {car.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={car.photoUrl} alt={car.name} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-6 w-6 text-zinc-300" />
            )}
          </div>
          <div className="flex w-2/3 min-w-0 flex-col justify-between p-3">
            <div>
              <h4 className="truncate text-sm font-bold text-zinc-900">{car.name}</h4>
              <div className="mt-0.5 text-xs font-semibold text-zinc-700">
                {car.priceUsd ? `${car.priceUsd.toLocaleString("ru-RU")} $` : "Цена не указана"}
                {car.isSold ? " · продана" : ""}
              </div>
            </div>
            <div className="flex gap-3 text-[10px] font-medium text-zinc-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{car.year || "—"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                <span>{car.mileage ? `${car.mileage.toLocaleString("ru-RU")} км` : "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}
