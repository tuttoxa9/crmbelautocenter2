"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AdCar, AdCampaignType, AdPriceTier } from "@/lib/types";
import { calculatePriceTier, getPriceTierLabel } from "@/lib/services/adsService";
import { Search, Car, X, Calendar } from "lucide-react";

interface CatalogCar {
  id: string;
  name: string;
  make?: string;
  model?: string;
  year?: string | number;
  priceUsd: number;
  photoUrl?: string;
  createdAt?: string | number;
}

interface AddAdCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCar: (carData: Omit<AdCar, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  existingCarIds?: string[];
  defaultRk1Days: number;
  defaultRk2Days: number;
}

function formatCarAddedDate(dateStr?: string | number | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return "Добавлен сегодня";

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Добавлен вчера";

    const months = [
      "янв", "фев", "мар", "апр", "мая", "июн",
      "июл", "авг", "сен", "окт", "ноя", "дек"
    ];
    return `Добавлен ${d.getDate()} ${months[d.getMonth()]}`;
  } catch {
    return "";
  }
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

  const handleSelectCatalogCar = (car: CatalogCar) => {
    setSelectedCatalogCar(car);
    setName(car.name);
    setYear(car.year ? String(car.year) : "");
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

      const payload: any = {
        name: name.trim(),
        priceUsd: numericPrice,
        priceTier: tier,
        campaign,
        startedAt: Date.now(),
        maxDays,
      };

      if (selectedCatalogCar?.id) payload.carId = selectedCatalogCar.id;
      if (year && String(year).trim()) payload.year = String(year).trim();
      if (photoUrl && photoUrl.trim()) payload.photoUrl = photoUrl.trim();
      if (notes && notes.trim()) payload.notes = notes.trim();

      await onAddCar(payload);
      onClose();
    } catch (err: any) {
      console.error("Error adding car to ads:", err);
      alert("Ошибка при сохранении: " + (err?.message || "Попробуйте еще раз"));
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-900/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col z-10 h-full border-l border-zinc-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0 bg-white">
          <h2 className="text-base font-semibold text-zinc-900">
            Добавить автомобиль в рекламу
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-6 pt-4 pb-2 shrink-0 bg-white">
          <div className="flex bg-zinc-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveMode("catalog")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeMode === "catalog"
                  ? "bg-white text-zinc-900 shadow-xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Со склада сайта
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("manual")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeMode === "manual"
                  ? "bg-white text-zinc-900 shadow-xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Вручную
            </button>
          </div>
        </div>

        {/* Content Area */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5 flex flex-col">
          {activeMode === "catalog" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Поиск авто..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 rounded-xl h-10 text-xs focus:bg-white"
                />
              </div>

              {/* Fixed Height Container to prevent layout shift */}
              <div className="h-64 border border-zinc-200/80 rounded-xl p-2 bg-zinc-50/50">
                {isLoadingCatalog ? (
                  <div className="h-full flex items-center justify-center text-zinc-400 text-xs gap-2">
                    <Spinner className="w-4 h-4" />
                    Загрузка склада...
                  </div>
                ) : filteredCatalog.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                    Автомобили не найдены
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto space-y-2 pr-1">
                    {filteredCatalog.map((car) => {
                      const isSelected = selectedCatalogCar?.id === car.id;
                      const isAlreadyInAds = existingCarIds.includes(car.id);
                      const addedDateFormatted = formatCarAddedDate(car.createdAt);

                      return (
                        <div
                          key={car.id}
                          onClick={() => handleSelectCatalogCar(car)}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                            isSelected
                              ? "bg-zinc-900 border-zinc-900 text-white shadow-xs"
                              : "bg-white border-zinc-200/80 hover:border-zinc-300 text-zinc-800"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {car.photoUrl ? (
                              <img
                                src={car.photoUrl}
                                alt={car.name}
                                className="w-12 h-9 object-cover rounded-lg bg-zinc-100 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-9 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 text-zinc-400">
                                <Car className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                                <span>{car.name}</span>
                                {car.year && (
                                  <span className={`text-[11px] font-normal ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
                                    {car.year} г.
                                  </span>
                                )}
                                {isAlreadyInAds && (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                    isSelected
                                      ? "bg-white/20 text-white"
                                      : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                                  }`}>
                                    в рекламе
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[11px] ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
                                  {getPriceTierLabel(calculatePriceTier(car.priceUsd))}
                                </span>
                                {addedDateFormatted && (
                                  <>
                                    <span className={`text-[9px] ${isSelected ? "text-zinc-400" : "text-zinc-300"}`}>•</span>
                                    <span className={`text-[11px] ${isSelected ? "text-zinc-300 font-medium" : "text-zinc-500"}`}>
                                      {addedDateFormatted}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 pl-3">
                            <div className={`font-bold text-xs ${isSelected ? "text-white" : "text-zinc-900"}`}>
                              ${Number(car.priceUsd).toLocaleString("ru-RU")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Fields without placeholders */}
          <div className="space-y-4 pt-2 border-t border-zinc-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700">Марка и модель</Label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700">Год выпуска</Label>
                <Input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700">Цена в долларах</Label>
                <Input
                  type="number"
                  required
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value ? Number(e.target.value) : "")}
                  className="bg-zinc-50 border-zinc-200 text-zinc-900 font-semibold focus:bg-white rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700">Ценовая группа TikTok</Label>
                <div className="h-10 px-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center text-xs font-medium text-zinc-800">
                  {priceUsd ? getPriceTierLabel(calculatedTier) : "—"}
                </div>
              </div>
            </div>

            {/* Campaign Selection - Clean Neutral Styling */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-700">Кампания для запуска</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCampaign("rk1")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    campaign === "rk1"
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700"
                  }`}
                >
                  <div className={`text-xs font-semibold ${campaign === "rk1" ? "text-white" : "text-zinc-900"}`}>
                    РК 1
                  </div>
                  <div className={`text-[11px] mt-0.5 ${campaign === "rk1" ? "text-zinc-300" : "text-zinc-500"}`}>
                    Лимит {defaultRk1Days} дн.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCampaign("rk2")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    campaign === "rk2"
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700"
                  }`}
                >
                  <div className={`text-xs font-semibold ${campaign === "rk2" ? "text-white" : "text-zinc-900"}`}>
                    РК 2
                  </div>
                  <div className={`text-[11px] mt-0.5 ${campaign === "rk2" ? "text-zinc-300" : "text-zinc-500"}`}>
                    Лимит {defaultRk2Days} дн.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCampaign("waiting_video")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    campaign === "waiting_video"
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700"
                  }`}
                >
                  <div className={`text-xs font-semibold ${campaign === "waiting_video" ? "text-white" : "text-zinc-900"}`}>
                    Ожидает съёмки
                  </div>
                  <div className={`text-[11px] mt-0.5 ${campaign === "waiting_video" ? "text-zinc-300" : "text-zinc-500"}`}>
                    В очередь
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700">Свой лимит дней</Label>
                <Input
                  type="number"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value ? Number(e.target.value) : "")}
                  className="bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700">Заметка</Label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white rounded-xl h-10 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="pt-4 mt-auto border-t border-zinc-200 flex items-center justify-end gap-2.5 shrink-0 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-100 text-xs rounded-xl h-10 px-4"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name || !priceUsd}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl h-10 px-5 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Сохранение...
                </>
              ) : (
                "Добавить в рекламу"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
