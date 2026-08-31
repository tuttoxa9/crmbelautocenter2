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
  scheduleAdCars,
  DEFAULT_ADS_SETTINGS,
  getMinskDateKey,
  addDaysToDateKey,
} from "@/lib/services/adsService";
import { AdCar, AdCampaignType, AdsSettings, TikTokDebt } from "@/lib/types";
import { AddAdCarModal } from "./AddAdCarModal";
import { AdsSettingsModal } from "./AdsSettingsModal";
import { DailyTasksModal } from "./DailyTasksModal";
import { OnAirBoard } from "./OnAirBoard";
import { TodayShift } from "./TodayShift";
import { WarehouseDrawer, type WarehouseCar } from "./WarehouseDrawer";
import { ConfirmSheet, PostponeSheet, nextAirDateLabel, type PreviewDay } from "./ScheduleSheets";
import { chooseCampaignForNewCar } from "@/lib/services/adsSchedule";
import { GhostBtn, PrimaryBtn, AdsScroller } from "./chrome";
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
    dateKey: string;
    cars: AdCar[];
    debts: TikTokDebt[];
  }>({ isOpen: false, date: new Date(), offset: 0, dateKey: "", cars: [], debts: [] });

  const [equalize, setEqualize] = useState<{
    open: boolean;
    message?: string;
    days?: PreviewDay[];
  }>({ open: false });
  const [postpone, setPostpone] = useState<
    | { open: false }
    | { open: true; mode: "date"; title: string; hint?: string; minDateKey: string; carIds?: string[]; fromDateKey?: string }
    | { open: true; mode: "vacation"; title: string; hint?: string; minDateKey: string }
  >({ open: false });

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

  const applyScheduleCars = (next: AdCar[]) => {
    carsRef.current = next;
    setCars(next);
    setSelectedDayTasks((prev) => {
      if (!prev.isOpen) return prev;
      const key = prev.dateKey;
      const dayCars = next.filter((c) => {
        if (c.campaign !== "rk1" && c.campaign !== "rk2") return false;
        return c.targetRotationDate ? getMinskDateKey(c.targetRotationDate) === key : false;
      });
      return { ...prev, cars: dayCars };
    });
  };

  const handleEqualizePreview = async () => {
    try {
      setIsBalancing(true);
      const res = await scheduleAdCars({ action: "equalize", preview: true });
      if (!res.success) {
        showToast(res.error || "Не удалось посчитать график", "error");
        return;
      }
      setEqualize({ open: true, message: res.message, days: res.days });
    } catch {
      showToast("Не удалось посчитать график", "error");
    } finally {
      setIsBalancing(false);
    }
  };

  const handleEqualizeConfirm = async () => {
    try {
      setIsBalancing(true);
      const res = await scheduleAdCars({ action: "equalize" });
      if (res.success && Array.isArray(res.cars)) {
        applyScheduleCars(res.cars);
        setEqualize({ open: false });
        showToast(res.message || "График выровнен");
      } else {
        showToast(res.error || "Ошибка при выравнивании", "error");
      }
    } catch {
      showToast("Ошибка при выравнивании", "error");
    } finally {
      setIsBalancing(false);
    }
  };

  const runSchedule = async (
    body: Parameters<typeof scheduleAdCars>[0],
    okText: string,
  ) => {
    try {
      setIsBalancing(true);
      const res = await scheduleAdCars(body);
      if (res.success && Array.isArray(res.cars)) {
        applyScheduleCars(res.cars);
        setPostpone({ open: false });
        showToast(res.message || okText);
      } else {
        showToast(res.error || "Не удалось сдвинуть", "error");
      }
    } catch {
      showToast("Не удалось сдвинуть", "error");
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
      setSelectedDayTasks((prev) => {
        if (!prev.isOpen) return prev;
        const key = prev.dateKey;
        return {
          ...prev,
          cars: updatedCars.filter((c) => {
            if (c.campaign !== "rk1" && c.campaign !== "rk2") return false;
            return c.targetRotationDate ? getMinskDateKey(c.targetRotationDate) === key : false;
          }),
        };
      });
      const label = PIPELINE.find((p) => p.id === targetCampaign)?.label || targetCampaign;
      showToast(
        car.campaign === targetCampaign
          ? `${car.name}: новая ротация в ${label}`
          : `${car.name} → ${label}`,
      );
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

  const handleSaveDebts = async (tiktokDebts: TikTokDebt[]) => {
    await updateAdsSettings({ tiktokDebts });
    setSettings((prev) => ({ ...prev, tiktokDebts }));
    setSelectedDayTasks((prev) => {
      if (!prev.isOpen) return prev;
      return { ...prev, debts: tiktokDebts.filter((d) => d.dateKey === prev.dateKey) };
    });
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
    <div className="ads-os flex h-full min-h-0 flex-col text-ads-ink">
      <header className="shrink-0 border-b border-ads-line/70 bg-ads-bg/72 backdrop-blur-2xl">
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

      <AdsScroller className="min-h-0 flex-1" contentClassName="min-h-full lg:h-full">
      <div className="mx-auto flex min-h-0 w-full max-w-[92rem] flex-col px-4 py-5 sm:px-6 sm:py-6 lg:h-full">
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
          <div className="grid h-full grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
            <div className="ads-skeleton h-[32rem] rounded-[22px]" />
            <div className="ads-skeleton h-[32rem] rounded-[22px]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(300px,380px)_1fr] lg:items-stretch">
            <TodayShift
              cars={cars}
              settings={settings}
              busyIds={busyIds}
              balancing={isBalancing}
              nextDueLabel={nextAirDateLabel(cars)}
              onSwitch={handlers.onSwitch}
              onDelete={handlers.onDelete}
              onEqualize={() => void handleEqualizePreview()}
              onVacation={() =>
                setPostpone({
                  open: true,
                  mode: "vacation",
                  title: "Каникулы",
                  hint: "Весь график с сегодня уедет вперёд. Эти дни будут пустые.",
                  minDateKey: getMinskDateKey(Date.now()),
                })
              }
              onOpenWarehouse={() => setWarehouseOpen(true)}
              onDayClick={(offset, date, dayCars, dayDebts) =>
                setSelectedDayTasks({
                  isOpen: true,
                  date,
                  offset,
                  dateKey: addDaysToDateKey(getMinskDateKey(Date.now()), offset),
                  cars: dayCars,
                  debts: dayDebts || [],
                })
              }
            />
            <OnAirBoard cars={cars} settings={settings} busyIds={busyIds} {...handlers} />
          </div>
        )}
      </div>
      </AdsScroller>

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
        suggestedAir={chooseCampaignForNewCar(
          cars.filter((c) => c.campaign === "rk1").length,
          cars.filter((c) => c.campaign === "rk2").length,
        )}
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
        cars={catalogCars}
        onSaveDebts={handleSaveDebts}
      />
      <DailyTasksModal
        isOpen={selectedDayTasks.isOpen}
        onClose={() => setSelectedDayTasks((p) => ({ ...p, isOpen: false }))}
        date={selectedDayTasks.date}
        offset={selectedDayTasks.offset}
        cars={selectedDayTasks.cars}
        debts={selectedDayTasks.debts}
        busyIds={busyIds}
        onRotate={handleSwitchCampaign}
        onPostponeCar={(car) => {
          if (!car.id) return;
          setPostpone({
            open: true,
            mode: "date",
            title: `Отложить ${car.name}`,
            hint: "Встанет первой в выбранный день. Остальные чуть уедут вперёд.",
            minDateKey: getMinskDateKey(Date.now()),
            carIds: [car.id],
          });
        }}
        onPostponeDay={() =>
          setPostpone({
            open: true,
            mode: "date",
            title: "Отложить день",
            hint: "Все машины этого дня встанут в начало выбранной даты.",
            minDateKey: selectedDayTasks.dateKey || getMinskDateKey(Date.now()),
            fromDateKey: selectedDayTasks.dateKey,
          })
        }
        onRemoveDebt={(id) => void handleSaveDebts((settings.tiktokDebts || []).filter((d) => d.id !== id))}
      />
      <ConfirmSheet
        open={equalize.open}
        title="Выровнять к 50 / 50"
        message={equalize.message}
        days={equalize.days}
        confirmLabel="Записать график"
        busy={isBalancing}
        onClose={() => setEqualize({ open: false })}
        onConfirm={() => void handleEqualizeConfirm()}
      />
      <PostponeSheet
        open={postpone.open}
        title={postpone.open ? postpone.title : "Отложить"}
        hint={postpone.open ? postpone.hint : undefined}
        mode={postpone.open ? postpone.mode : "date"}
        minDateKey={postpone.open ? postpone.minDateKey : getMinskDateKey(Date.now())}
        busy={isBalancing}
        onClose={() => setPostpone({ open: false })}
        onPickDate={(toDateKey) => {
          if (!postpone.open || postpone.mode !== "date") return;
          if (postpone.carIds?.length) {
            void runSchedule({ action: "postponeCars", carIds: postpone.carIds, toDateKey }, "Отложено");
            return;
          }
          if (postpone.fromDateKey) {
            void runSchedule(
              { action: "postponeDay", fromDateKey: postpone.fromDateKey, toDateKey },
              "День сдвинут",
            );
          }
        }}
        onPickDays={(days) => {
          void runSchedule(
            { action: "shift", days, fromDateKey: getMinskDateKey(Date.now()) },
            "График сдвинут",
          );
        }}
      />
    </div>
  );
}
