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
  getCalendarDaysLeft,
  rebalanceAdCars,
  DEFAULT_ADS_SETTINGS,
} from "@/lib/services/adsService";
import { AdCar, AdCampaignType, AdsSettings } from "@/lib/types";
import { AddAdCarModal } from "./AddAdCarModal";
import { AdsSettingsModal } from "./AdsSettingsModal";
import { DailyTasksModal } from "./DailyTasksModal";
import { OnAirBoard } from "./OnAirBoard";
import { TodayShift } from "./TodayShift";
import { WarehouseDrawer, type WarehouseCar } from "./WarehouseDrawer";
import { GhostBtn, PrimaryBtn } from "./chrome";
import { Plus, Settings } from "lucide-react";

interface CatalogCar {
  id: string;
  name: string;
  year?: string | number;
  priceUsd: number;
  photoUrl?: string;
  createdAt?: string | number;
}

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

  const [warehouseOpen, setWarehouseOpen] = useState(false);
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
    catalogCar: WarehouseCar,
    targetCampaign: AdCampaignType,
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
          ? {
              ...prev,
              cars: updatedCars
                .filter((c) => prev.cars.some((x) => x.id === c.id) || c.id === car.id)
                .filter((c) => c.campaign === "rk1" || c.campaign === "rk2"),
            }
          : prev,
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

  const warehouse = useMemo(
    () => catalogCars.filter((c) => !trackedIds.has(c.id)),
    [catalogCars, trackedIds],
  );

  const workCount = useMemo(
    () =>
      cars.filter((c) => {
        if (c.campaign !== "rk1" && c.campaign !== "rk2") return false;
        return getCalendarDaysLeft(c.targetRotationDate, c.startedAt, c.maxDays) <= 0;
      }).length,
    [cars],
  );
  const airCount = cars.filter((c) => c.campaign === "rk1" || c.campaign === "rk2").length;

  const handlers = {
    onSwitch: handleSwitchCampaign,
    onSaveDays: handleSaveCarDays,
    onReset: executeResetTimer,
    onDelete: executeDeleteCar,
  };

  return (
    <div className="ads-os min-h-full text-ads-ink">
      <header className="sticky top-0 z-20 border-b border-ads-line/70 bg-ads-bg/72 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg leading-none font-semibold tracking-tight text-ads-ink">Ротация</h1>
            <p className="mt-0.5 truncate text-xs text-ads-subtle">TikTok · Белавтоцентр</p>
          </div>
          <div className="flex items-center gap-1">
            {workCount > 0 && (
              <span className="mr-1 hidden h-7 items-center rounded-full bg-ads-danger-soft px-2.5 font-mono text-xs font-semibold text-ads-danger sm:inline-flex">
                {workCount}
              </span>
            )}
            <GhostBtn
              className="size-9 px-0 sm:h-9 sm:w-auto sm:px-3"
              onClick={() => setIsSettingsModalOpen(true)}
              title="Правила"
            >
              <Settings className="size-3.5" />
              <span className="hidden sm:inline">Правила</span>
            </GhostBtn>
            <PrimaryBtn className="h-9 px-3" onClick={() => setWarehouseOpen(true)}>
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">Авто</span>
            </PrimaryBtn>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[92rem] px-4 py-5 sm:px-6 sm:py-6">
        {loadError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-ads-danger-soft px-4 py-3">
            <p className="text-sm text-ads-danger">{loadError}</p>
            <PrimaryBtn
              className="h-8 px-3 text-xs"
              onClick={() => {
                setIsLoading(true);
                loadData();
              }}
            >
              Повторить
            </PrimaryBtn>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
            <div className="ads-skeleton h-[32rem] rounded-[22px]" />
            <div className="ads-skeleton h-[32rem] rounded-[22px]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(300px,380px)_1fr]">
            <TodayShift
              cars={cars}
              settings={settings}
              busyIds={busyIds}
              balancing={isBalancing}
              onSwitch={handlers.onSwitch}
              onBalance={() => void handleBalanceTimeline()}
              onOpenWarehouse={() => setWarehouseOpen(true)}
              onDayClick={(offset, date, dayCars) =>
                setSelectedDayTasks({ isOpen: true, date, offset, cars: dayCars })
              }
            />
            <OnAirBoard cars={cars} settings={settings} busyIds={busyIds} {...handlers} />
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-medium text-ads-paper shadow-ads-float ${
            toast.type === "error" ? "bg-ads-danger" : "bg-ads-ink"
          }`}
        >
          {toast.text}
        </div>
      )}

      <WarehouseDrawer
        open={warehouseOpen}
        onClose={() => setWarehouseOpen(false)}
        warehouse={warehouse}
        addingId={addingCarId}
        onAdd={(car, campaign) => void handleQuickAddWarehouseCar(car, campaign)}
        onManual={() => {
          setWarehouseOpen(false);
          setIsAddModalOpen(true);
        }}
      />
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
        airCount={airCount}
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
