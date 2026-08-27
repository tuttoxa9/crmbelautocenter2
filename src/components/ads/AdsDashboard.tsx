"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getAdCars,
  createAdCar,
  updateAdCar,
  resetAdCarTimer,
  deleteAdCar,
  getAdsSettings,
  updateAdsSettings,
  calculatePriceTier,
  getPriceTierLabel,
  getCalendarDaysLeft,
  rebalanceAdCars,
  DEFAULT_ADS_SETTINGS,
} from "@/lib/services/adsService";
import { AdCar, AdCampaignType, AdPriceTier, AdsSettings } from "@/lib/types";
import { AddAdCarModal } from "./AddAdCarModal";
import { AdsSettingsModal } from "./AdsSettingsModal";
import { RotationTimeline } from "./RotationTimeline";
import { DailyTasksModal } from "./DailyTasksModal";
import { AdsCarCard } from "./AdsCarCard";
import { AdsKpiStrip } from "./AdsKpiStrip";
import { AdsTodayQueue } from "./AdsTodayQueue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Car,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";

interface CatalogCar {
  id: string;
  name: string;
  year?: string | number;
  priceUsd: number;
  photoUrl?: string;
  createdAt?: string | number;
}

const TIERS: AdPriceTier[] = [
  "tier_under_7k",
  "tier_7k_13k",
  "tier_13k_20k",
  "tier_20k_plus",
];

const PIPELINE: { id: AdCampaignType; label: string }[] = [
  { id: "waiting_video", label: "Съёмка" },
  { id: "ready_for_ads", label: "Отснято" },
  { id: "rk1", label: "РК 1" },
  { id: "rk2", label: "РК 2" },
];

export function AdsDashboard() {
  const [cars, setCars] = useState<AdCar[]>([]);
  const [catalogCars, setCatalogCars] = useState<CatalogCar[]>([]);
  const [settings, setSettings] = useState<AdsSettings>(DEFAULT_ADS_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addingCarId, setAddingCarId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [isBalancing, setIsBalancing] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "error" | "success" } | null>(null);

  const [boardCampaign, setBoardCampaign] = useState<AdCampaignType>("rk1");
  const [collapsedWarehouse, setCollapsedWarehouse] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedDayTasks, setSelectedDayTasks] = useState<{
    isOpen: boolean;
    date: Date;
    offset: number;
    cars: AdCar[];
  }>({ isOpen: false, date: new Date(), offset: 0, cars: [] });

  const carsRef = useRef<AdCar[]>([]);
  useEffect(() => {
    carsRef.current = cars;
  }, [cars]);

  const showToast = (text: string, type: "error" | "success" = "success") => {
    setToast({ text, type });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  const markBusy = (id: string | undefined, on: boolean) => {
    if (!id) return;
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const loadData = async () => {
    setLoadError(null);
    try {
      const [fetchedCars, fetchedSettings, catalogRes] = await Promise.all([
        getAdCars(),
        getAdsSettings(),
        fetch("/api/catalog/cars").then((r) => r.json()).catch(() => ({ cars: [] })),
      ]);
      setCars(fetchedCars);
      carsRef.current = fetchedCars;
      setSettings(fetchedSettings);
      if (catalogRes?.success && Array.isArray(catalogRes.cars)) {
        setCatalogCars(catalogRes.cars);
      }
    } catch (err) {
      console.error("Error loading ads data:", err);
      setLoadError("Не удалось загрузить доску рекламы");
      showToast("Не удалось загрузить данные рекламы", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, []);

  const handleBalanceTimeline = async () => {
    try {
      setIsBalancing(true);
      const res = await rebalanceAdCars(Number(settings.targetCarsPerDay || 3));
      if (res.success && Array.isArray(res.cars)) {
        carsRef.current = res.cars;
        setCars(res.cars);
        showToast(`Сбалансировано ${res.totalBalanced || res.cars.length} авто`);
      } else {
        showToast(res.error || "Ошибка при балансировке", "error");
      }
    } catch {
      showToast("Ошибка при балансировке", "error");
    } finally {
      setIsBalancing(false);
    }
  };

  const handleAddCar = async (carData: Omit<AdCar, "id" | "createdAt" | "updatedAt">) => {
    const newCar = await createAdCar(carData);
    const next = [newCar, ...carsRef.current];
    carsRef.current = next;
    setCars(next);
    showToast(`«${carData.name}» добавлен в рекламу`);
  };

  const handleQuickAddWarehouseCar = async (
    catalogCar: CatalogCar,
    targetCampaign: AdCampaignType
  ) => {
    if (addingCarId) return;
    try {
      setAddingCarId(catalogCar.id);
      const newCar = await createAdCar({
        carId: catalogCar.id,
        name: catalogCar.name,
        year: catalogCar.year ? String(catalogCar.year) : undefined,
        priceUsd: catalogCar.priceUsd,
        priceTier: calculatePriceTier(catalogCar.priceUsd),
        campaign: targetCampaign,
        startedAt: Date.now(),
        photoUrl: catalogCar.photoUrl,
      });
      const next = [newCar, ...carsRef.current];
      carsRef.current = next;
      setCars(next);
      showToast(`«${catalogCar.name}» добавлен`);
    } catch (err: any) {
      showToast(err?.message || "Ошибка при добавлении авто", "error");
    } finally {
      setAddingCarId(null);
    }
  };

  const handleSwitchCampaign = async (car: AdCar, targetCampaign: AdCampaignType) => {
    if (!car.id) return;
    const snapshot = carsRef.current;
    markBusy(car.id, true);
    try {
      await updateAdCar(car.id, { campaign: targetCampaign });
      const updatedCars = await getAdCars();
      carsRef.current = updatedCars;
      setCars(updatedCars);
      setSelectedDayTasks((prev) =>
        prev.isOpen
          ? { ...prev, cars: updatedCars.filter((c) => prev.cars.some((x) => x.id === c.id) || c.id === car.id).filter((c) => c.campaign === "rk1" || c.campaign === "rk2") }
          : prev
      );
      showToast(`${car.name} → ${PIPELINE.find((p) => p.id === targetCampaign)?.label}`);
    } catch {
      carsRef.current = snapshot;
      setCars(snapshot);
      showToast("Не удалось переключить кампанию", "error");
    } finally {
      markBusy(car.id, false);
    }
  };

  const handleSaveCarDays = async (car: AdCar, newDays: number) => {
    if (!car.id || !newDays || newDays <= 0) return;
    markBusy(car.id, true);
    try {
      await updateAdCar(car.id, { maxDays: newDays });
      const updated = await getAdCars();
      carsRef.current = updated;
      setCars(updated);
      showToast(`Срок для «${car.name}»: ${newDays} дн.`);
    } catch {
      showToast("Не удалось сохранить срок", "error");
    } finally {
      markBusy(car.id, false);
    }
  };

  const executeResetTimer = async (car: AdCar) => {
    if (!car.id) return;
    markBusy(car.id, true);
    try {
      await resetAdCarTimer(car.id);
      const updated = await getAdCars();
      carsRef.current = updated;
      setCars(updated);
      showToast(`Таймер сброшен: ${car.name}`);
    } catch {
      showToast("Не удалось сбросить таймер", "error");
    } finally {
      markBusy(car.id, false);
    }
  };

  const executeDeleteCar = async (car: AdCar) => {
    if (!car.id) return;
    const snapshot = carsRef.current;
    setCars((prev) => prev.filter((c) => c.id !== car.id));
    markBusy(car.id, true);
    try {
      await deleteAdCar(car.id);
      carsRef.current = carsRef.current.filter((c) => c.id !== car.id);
      showToast(`«${car.name}» убран из рекламы`);
    } catch {
      carsRef.current = snapshot;
      setCars(snapshot);
      showToast("Не удалось удалить авто", "error");
    } finally {
      markBusy(car.id, false);
    }
  };

  const handleSaveSettings = async (newSettings: Partial<AdsSettings>) => {
    await updateAdsSettings(newSettings);
    setSettings((prev) => ({ ...prev, ...newSettings }));
    showToast("Настройки сохранены");
  };

  const trackedIds = useMemo(() => {
    const idSet = new Set<string>();
    cars.forEach((c) => {
      if (c.carId) idSet.add(c.carId);
      if (c.id) idSet.add(c.id);
    });
    return idSet;
  }, [cars]);

  const overdue = useMemo(
    () =>
      cars.filter((c) => {
        if (c.campaign !== "rk1" && c.campaign !== "rk2") return false;
        return getCalendarDaysLeft(c.targetRotationDate, c.startedAt, c.maxDays) < 0;
      }),
    [cars]
  );

  const dueToday = useMemo(
    () =>
      cars.filter((c) => {
        if (c.campaign !== "rk1" && c.campaign !== "rk2") return false;
        return getCalendarDaysLeft(c.targetRotationDate, c.startedAt, c.maxDays) === 0;
      }),
    [cars]
  );

  const warehouseCount = useMemo(
    () => catalogCars.filter((c) => !trackedIds.has(c.id)).length,
    [catalogCars, trackedIds]
  );

  const kpis = {
    dueToday: dueToday.length,
    overdue: overdue.length,
    rk1: cars.filter((c) => c.campaign === "rk1").length,
    rk2: cars.filter((c) => c.campaign === "rk2").length,
    waiting: cars.filter((c) => c.campaign === "waiting_video").length,
    ready: cars.filter((c) => c.campaign === "ready_for_ads").length,
    warehouse: warehouseCount,
  };

  const query = searchQuery.toLowerCase().trim();

  const boardAdCarsByTier = useMemo(() => {
    const map: Record<AdPriceTier, AdCar[]> = {
      tier_under_7k: [],
      tier_7k_13k: [],
      tier_13k_20k: [],
      tier_20k_plus: [],
    };
    cars
      .filter((c) => c.campaign === boardCampaign)
      .filter((c) => {
        if (!query) return true;
        return (
          c.name.toLowerCase().includes(query) ||
          String(c.year || "").includes(query) ||
          String(c.priceUsd).includes(query)
        );
      })
      .forEach((c) => {
        const tier = c.priceTier || calculatePriceTier(c.priceUsd);
        if (map[tier]) map[tier].push(c);
      });
    return map;
  }, [cars, boardCampaign, query]);

  const boardWarehouseCarsByTier = useMemo(() => {
    const map: Record<AdPriceTier, CatalogCar[]> = {
      tier_under_7k: [],
      tier_7k_13k: [],
      tier_13k_20k: [],
      tier_20k_plus: [],
    };
    catalogCars
      .filter((c) => !trackedIds.has(c.id))
      .filter((c) => {
        if (!query) return true;
        return (
          c.name.toLowerCase().includes(query) ||
          String(c.year || "").includes(query) ||
          String(c.priceUsd).includes(query)
        );
      })
      .forEach((c) => {
        const tier = calculatePriceTier(c.priceUsd);
        if (map[tier]) map[tier].push(c);
      });
    return map;
  }, [catalogCars, trackedIds, query]);

  const cardHandlers = {
    onSwitch: handleSwitchCampaign,
    onSaveDays: handleSaveCarDays,
    onReset: executeResetTimer,
    onDelete: executeDeleteCar,
  };

  return (
    <div className="ads-console flex flex-col min-h-full bg-[#F4F5F7] text-zinc-900">
      <header className="bg-white border-b border-zinc-200/80 px-3 sm:px-6 py-4 sticky top-0 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-[1600px] mx-auto">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Реклама TikTok</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Ротация креативов, съёмка и подбор авто со склада
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsModalOpen(true)}
              className="bg-white border-zinc-200 h-9 rounded-xl text-xs gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              Настройки
            </Button>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white h-9 rounded-xl text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Добавить авто
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto w-full space-y-4 flex-1">
        {loadError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-rose-800">{loadError}</p>
            <Button
              size="sm"
              onClick={() => {
                setIsLoading(true);
                loadData();
              }}
              className="h-8 rounded-lg bg-zinc-900 text-white text-xs"
            >
              Повторить
            </Button>
          </div>
        )}

        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <AdsKpiStrip
              kpis={kpis}
              onDueClick={() =>
                setSelectedDayTasks({ isOpen: true, date: new Date(), offset: 0, cars: dueToday })
              }
              onOverdueClick={() =>
                setSelectedDayTasks({ isOpen: true, date: new Date(), offset: -1, cars: overdue })
              }
            />

            <AdsTodayQueue
              dueToday={dueToday}
              overdue={overdue}
              settings={settings}
              busyIds={busyIds}
              {...cardHandlers}
            />

            <RotationTimeline
              cars={cars}
              settings={settings}
              onDayClick={(offset, date, dayCars) =>
                setSelectedDayTasks({ isOpen: true, date, offset, cars: dayCars })
              }
              onBalance={handleBalanceTimeline}
              isBalancing={isBalancing}
            />

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-2 sm:p-3 rounded-2xl border border-zinc-200/80">
              <div className="flex items-center gap-1 overflow-x-auto">
                {PIPELINE.map((item) => {
                  const count =
                    item.id === "rk1"
                      ? kpis.rk1
                      : item.id === "rk2"
                        ? kpis.rk2
                        : item.id === "waiting_video"
                          ? kpis.waiting
                          : kpis.ready;
                  const active = boardCampaign === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBoardCampaign(item.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${
                        active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                      }`}
                    >
                      {item.label}
                      <span
                        className={`tabular-nums text-[11px] px-1.5 rounded-full ${
                          active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="relative sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Поиск по имени, году, цене"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 bg-zinc-50 border-zinc-200 h-9 text-xs rounded-xl"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
              {TIERS.map((tierKey) => {
                const tierAdCars = boardAdCarsByTier[tierKey] || [];
                const tierWarehouseCars = boardWarehouseCarsByTier[tierKey] || [];
                const collapsed = !!collapsedWarehouse[tierKey];
                return (
                  <section
                    key={tierKey}
                    className="bg-white rounded-2xl border border-zinc-200/80 flex flex-col overflow-hidden"
                  >
                    <header className="px-4 py-3 border-b border-zinc-100">
                      <div className="text-xs font-semibold text-zinc-900">
                        {getPriceTierLabel(tierKey)}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {tierAdCars.length} в эфире · {tierWarehouseCars.length} на складе
                      </div>
                    </header>

                    <div className="p-2.5 space-y-2 min-h-[140px]">
                      {tierAdCars.length === 0 ? (
                        <div className="py-8 text-center text-zinc-400">
                          <Car className="w-4 h-4 mx-auto mb-1.5 opacity-40" />
                          <p className="text-xs">Пусто в этой группе</p>
                        </div>
                      ) : (
                        tierAdCars.map((car) => (
                          <AdsCarCard
                            key={car.id}
                            car={car}
                            settings={settings}
                            busy={!!car.id && busyIds.has(car.id)}
                            {...cardHandlers}
                          />
                        ))
                      )}
                    </div>

                    <div className="border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedWarehouse((prev) => ({ ...prev, [tierKey]: !prev[tierKey] }))
                        }
                        className="w-full px-3 py-2.5 text-left text-xs font-semibold text-zinc-800 hover:bg-zinc-50 flex items-center justify-between"
                      >
                        <span>Со склада · {tierWarehouseCars.length}</span>
                        {collapsed ? (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-zinc-400" />
                        )}
                      </button>
                      {!collapsed && (
                        <div className="px-2.5 pb-3 space-y-1.5 max-h-72 overflow-y-auto">
                          {tierWarehouseCars.length === 0 ? (
                            <p className="text-[11px] text-zinc-400 text-center py-4">
                              Нет свободных авто
                            </p>
                          ) : (
                            tierWarehouseCars.map((wCar) => {
                              const isAdding = addingCarId === wCar.id;
                              return (
                                <div
                                  key={wCar.id}
                                  className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200/80"
                                >
                                  {wCar.photoUrl ? (
                                    <img
                                      src={wCar.photoUrl}
                                      alt=""
                                      className="w-10 h-8 object-cover rounded-lg bg-zinc-100"
                                    />
                                  ) : (
                                    <div className="w-10 h-8 rounded-lg bg-zinc-100" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-semibold text-zinc-900 truncate">
                                      {wCar.name}
                                    </div>
                                    <div className="text-[11px] text-zinc-500 tabular-nums">
                                      ${Number(wCar.priceUsd).toLocaleString("ru-RU")}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={isAdding || !!addingCarId}
                                    onClick={() =>
                                      handleQuickAddWarehouseCar(wCar, boardCampaign)
                                    }
                                    className="h-8 px-2 rounded-lg bg-zinc-900 text-white text-[11px] font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                                  >
                                    {isAdding ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Plus className="w-3 h-3" />
                                    )}
                                    В этап
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === "error" ? "bg-rose-600 text-white" : "bg-zinc-900 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}

      <AddAdCarModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddCar={handleAddCar}
        existingCarIds={Array.from(trackedIds)}
        defaultRk1Days={settings.rk1Days}
        defaultRk2Days={settings.rk2Days}
      />
      <AdsSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        totalCatalogCars={catalogCars.length}
      />
      <DailyTasksModal
        isOpen={selectedDayTasks.isOpen}
        onClose={() => setSelectedDayTasks((p) => ({ ...p, isOpen: false }))}
        date={selectedDayTasks.date}
        offset={selectedDayTasks.offset}
        cars={selectedDayTasks.cars}
        busyIds={busyIds}
        onRotate={handleSwitchCampaign}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-[72px] rounded-2xl bg-white border border-zinc-200" />
        ))}
      </div>
      <div className="h-28 rounded-2xl bg-white border border-zinc-200" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-80 rounded-2xl bg-white border border-zinc-200" />
        ))}
      </div>
    </div>
  );
}
