"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { AdCar, AdCampaignType, AdPriceTier } from "@/lib/types";
import { calculatePriceTier, getPriceTierLabel } from "@/lib/services/adsService";
import { Search, Car, Sparkles, Plus, Image as ImageIcon } from "lucide-react";

interface CatalogCar {
  id: string;
  name: string;
  make?: string;
  model?: string;
  year?: string | number;
  priceUsd: number;
  photoUrl?: string;
}

interface AddAdCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCar: (carData: Omit<AdCar, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  existingCarIds?: string[];
  defaultRk1Days: number;
  defaultRk2Days: number;
}

export function AddAdCarModal({
  isOpen,
  onClose,
  onAddCar,
  existingCarIds = [],
  defaultRk1Days,
  defaultRk2Days,
}: AddAdCarModalProps) {
  const [activeMode, setActiveMode] = useState<"catalog" | "manual">("catalog");
  const [catalogCars, setCatalogCars] = useState<CatalogCar[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatalogCar, setSelectedCatalogCar] = useState<CatalogCar | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [priceUsd, setPriceUsd] = useState<number | "">("");
  const [campaign, setCampaign] = useState<AdCampaignType>("rk1");
  const [photoUrl, setPhotoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [customDays, setCustomDays] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load catalog cars from Neon DB API
  useEffect(() => {
    if (isOpen) {
      setIsLoadingCatalog(true);
      fetch("/api/catalog/cars")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.cars)) {
            setCatalogCars(data.cars);
          }
        })
        .catch((err) => console.error("Error fetching catalog cars:", err))
        .finally(() => setIsLoadingCatalog(false));
    } else {
      // Reset form on close
      setSelectedCatalogCar(null);
      setName("");
      setYear("");
      setPriceUsd("");
      setCampaign("rk1");
      setPhotoUrl("");
      setNotes("");
      setCustomDays("");
      setSearchQuery("");
    }
  }, [isOpen]);

  // When a catalog car is selected
  const handleSelectCatalogCar = (car: CatalogCar) => {
    setSelectedCatalogCar(car);
    setName(car.name);
    setYear(String(car.year || ""));
    setPriceUsd(car.priceUsd || "");
    setPhotoUrl(car.photoUrl || "");
  };

  const calculatedTier: AdPriceTier = calculatePriceTier(Number(priceUsd) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !priceUsd) return;

    try {
      setIsSubmitting(true);
      const numericPrice = Number(priceUsd);
      const tier = calculatePriceTier(numericPrice);

      const maxDays = customDays
        ? Number(customDays)
        : campaign === "rk1"
        ? defaultRk1Days
        : defaultRk2Days;

      await onAddCar({
        carId: selectedCatalogCar?.id,
        name: name.trim(),
        year: year ? String(year).trim() : undefined,
        priceUsd: numericPrice,
        priceTier: tier,
        campaign,
        startedAt: Date.now(),
        maxDays,
        photoUrl: photoUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err) {
      console.error("Error adding car to ads:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCatalog = catalogCars.filter((car) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      car.name.toLowerCase().includes(query) ||
      String(car.year || "").includes(query) ||
      String(car.priceUsd).includes(query)
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            Добавить автомобиль в рекламу
          </DialogTitle>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveMode("catalog")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeMode === "catalog"
                  ? "bg-zinc-800 text-white border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              Выбрать со склада сайта ({catalogCars.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("manual")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeMode === "manual"
                  ? "bg-zinc-800 text-white border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Вручную
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeMode === "catalog" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Поиск по складу (марка, модель, год, цена)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>

              {isLoadingCatalog ? (
                <div className="flex items-center justify-center py-8 text-zinc-400 text-sm gap-2">
                  <Spinner className="w-5 h-5" />
                  Загрузка автомобилей со склада...
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-zinc-800/80 rounded-lg p-2 bg-zinc-900/40">
                  {filteredCatalog.length === 0 ? (
                    <div className="text-xs text-zinc-500 text-center py-4">
                      Автомобили не найдены
                    </div>
                  ) : (
                    filteredCatalog.map((car) => {
                      const isSelected = selectedCatalogCar?.id === car.id;
                      const isAlreadyInAds = existingCarIds.includes(car.id);
                      return (
                        <div
                          key={car.id}
                          onClick={() => handleSelectCatalogCar(car)}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all border ${
                            isSelected
                              ? "bg-emerald-950/40 border-emerald-500/50 text-white"
                              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {car.photoUrl ? (
                              <img
                                src={car.photoUrl}
                                alt={car.name}
                                className="w-10 h-8 object-cover rounded bg-zinc-800 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-8 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-600">
                                <Car className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-sm truncate flex items-center gap-2">
                                <span>{car.name}</span>
                                {car.year && (
                                  <span className="text-xs text-zinc-400 font-normal">
                                    ({car.year})
                                  </span>
                                )}
                                {isAlreadyInAds && (
                                  <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-medium">
                                    уже в рекламе
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {getPriceTierLabel(calculatePriceTier(car.priceUsd))}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 font-bold text-sm text-emerald-400 pl-2">
                            ${Number(car.priceUsd).toLocaleString("ru-RU")}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Detailed Form */}
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Марка и модель *</Label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например, Chevrolet Equinox"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Год выпуска</Label>
                <Input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2020"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Цена в $ *</Label>
                <Input
                  type="number"
                  required
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value ? Number(e.target.value) : "")}
                  placeholder="17150"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Ценовая группа TikTok Ads</Label>
                <div className="h-9 px-3 rounded-md bg-zinc-900/80 border border-zinc-800 flex items-center">
                  <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 bg-indigo-950/20 text-xs font-semibold">
                    {getPriceTierLabel(calculatedTier)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Куда отправить автомобиль?</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCampaign("rk1")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    campaign === "rk1"
                      ? "bg-blue-950/40 border-blue-500 text-white shadow-sm"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="text-xs font-bold text-blue-400">РК 1</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Видео Владельца</div>
                  <div className="text-[10px] text-zinc-500 mt-1">Лимит: {defaultRk1Days} дн.</div>
                </button>

                <button
                  type="button"
                  onClick={() => setCampaign("rk2")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    campaign === "rk2"
                      ? "bg-purple-950/40 border-purple-500 text-white shadow-sm"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="text-xs font-bold text-purple-400">РК 2</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Видео SMM</div>
                  <div className="text-[10px] text-zinc-500 mt-1">Лимит: {defaultRk2Days} дн.</div>
                </button>

                <button
                  type="button"
                  onClick={() => setCampaign("waiting_video")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    campaign === "waiting_video"
                      ? "bg-amber-950/40 border-amber-500 text-white shadow-sm"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="text-xs font-bold text-amber-400">Ожидает съёмки</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">В очередь</div>
                  <div className="text-[10px] text-zinc-500 mt-1">Таймер на паузе</div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Ссылка на фото (URL)</Label>
                <Input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">
                  Индивидуальный лимит дней <span className="text-zinc-500">(опционально)</span>
                </Label>
                <Input
                  type="number"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value ? Number(e.target.value) : "")}
                  placeholder={`По умолчанию: ${campaign === "rk1" ? defaultRk1Days : defaultRk2Days}`}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Заметка к рекламе (опционально)</Label>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Например: Ссылка на ролик или номер объявления"
                className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-800 flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-zinc-800 text-zinc-400 hover:text-white"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name || !priceUsd}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Добавить в рекламу
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
