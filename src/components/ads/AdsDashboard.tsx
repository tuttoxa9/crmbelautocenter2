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
import { TodayQueue } from "./TodayQueue";
import { ShootBoard } from "./ShootBoard";
import { SchedulePane } from "./SchedulePane";
import { WarehouseDrawer, type WarehouseCar } from "./WarehouseDrawer";
import { ConfirmSheet, PostponeSheet, nextAirDateLabel, type PreviewDay } from "./ScheduleSheets";
import { chooseCampaignForNewCar } from "@/lib/services/adsSchedule";
import { GhostBtn, PrimaryBtn, AdsScroller } from "./chrome";
import { ADS_HINTS_KEY, CAMPAIGN_LABEL, HINTS, humanError } from "@/lib/ads/copy";
import { CalendarDays, Clapperboard, Plus, Radio, Settings, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Scene = "today" | "shoot" | "air" | "schedule";

interface CatalogCar {
  id: string;
  name: string;
  year?: string | number;
  priceUsd: number;
  photoUrl?: string;
  createdAt?: string | number;
}

export function AdsDashboard() {
  const [cars, setCars] = useState<AdCar[]>([]);
  const [catalogCars, setCatalogCars] = useState<CatalogCar[]>([]);
  const [settings, setSettings] = useState<AdsSettings>(DEFAULT_ADS_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addingCarId, setAddingCarId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [isBalancing, setIsBalancing] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "error" | "success"; undo?: () => void } | null>(null);
  const [scene, setScene] = useState<Scene>("today");
  const [hints, setHints] = useState(false);
  const [hintStep, setHintStep] = useState(0);

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

  useEffect(() => {
    try {
      if (!localStorage.getItem(ADS_HINTS_KEY)) setHints(true);
    } catch {
      // ignore
    }
    const onHints = () => {
      setHintStep(0);
      setHints(true);
    };
    window.addEventListener("ads-hints-reset", onHints);
    return () => window.removeEventListener("ads-hints-reset", onHints);
  }, []);

  const showToast = (text: string, type: "error" | "success" = "success", undo?: () => void) => {
    setToast({ text, type, undo });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, undo ? 5000 : 3500);
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
    showToast(`«${carData.name}» добавлен`);
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
      showToast(`«${catalogCar.name}» → ${CAMPAIGN_LABEL[targetCampaign]}`);
    } catch (err: any) {
      showToast(humanError(err?.message), "error");
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
      const label = CAMPAIGN_LABEL[targetCampaign];
      showToast(`${car.name} → ${label}`, "success", async () => {
        await updateAdCar(car.id!, {
          campaign: car.campaign,
          targetRotationDate: car.targetRotationDate,
          startedAt: car.startedAt,
          maxDays: car.maxDays,
        });
        const restored = await getAdCars();
        carsRef.current = restored;
        setCars(restored);
      });
    } catch {
      carsRef.current = snapshot;
      setCars(snapshot);
      showToast("Не получилось переключить кампанию", "error");
    } finally {
      markBusy(car.id, false);
    }
  };

  const handleMarkShot = async (car: AdCar) => {
    if (!car.id) return;
    const snapshot = carsRef.current;
    markBusy(car.id, true);
    try {
      const updated = await updateAdCar(car.id, { campaign: "ready_for_ads" });
      const updatedCars = await getAdCars();
      carsRef.current = updatedCars;
      setCars(updatedCars);
      setSelectedDayTasks((prev) => {
        if (!prev.isOpen) return prev;
        return { ...prev, cars: prev.cars.filter((c) => c.id !== car.id) };
      });
      const notify = updated?.shotNotifyStatus;
      showToast(
        notify === "failed"
          ? `${car.name} → Отснято. Пуш не ушёл`
          : `${car.name} → Отснято`,
        notify === "failed" ? "error" : "success",
        async () => {
          await updateAdCar(car.id!, { campaign: car.campaign, targetRotationDate: car.targetRotationDate });
          const restored = await getAdCars();
          carsRef.current = restored;
          setCars(restored);
        },
      );
    } catch {
      carsRef.current = snapshot;
      setCars(snapshot);
      showToast("Не получилось перевести в «Отснято»", "error");
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
      showToast("Не получилось сохранить срок", "error");
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
      showToast(`Срок заново: ${car.name}`);
    } catch {
      showToast("Не получилось сбросить срок", "error");
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
      showToast("Не получилось убрать машину", "error");
    } finally {
      markBusy(car.id, false);
    }
  };

  const handleSaveSettings = async (newSettings: Partial<AdsSettings>) => {
    await updateAdsSettings(newSettings);
    setSettings((prev) => ({ ...prev, ...newSettings }));
    showToast("Правила сохранены");
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
        if (c.sold) return false;
        if (c.campaign !== "rk1" && c.campaign !== "rk2") return false;
        return getCalendarDaysLeft(c.targetRotationDate, c.startedAt, c.maxDays) <= 0;
      }).length,
    [cars],
  );
  const airCount = cars.filter((c) => (c.campaign === "rk1" || c.campaign === "rk2") && !c.sold).length;
  const waitingCount = cars.filter((c) => c.campaign === "waiting_video").length;

  const handlers = {
    onSwitch: handleSwitchCampaign,
    onSaveDays: handleSaveCarDays,
    onReset: executeResetTimer,
    onDelete: executeDeleteCar,
  };

  const closeHints = () => {
    try {
      localStorage.setItem(ADS_HINTS_KEY, "1");
    } catch {
      // ignore
    }
    setHints(false);
  };

  return (
    <div className="ads-os flex h-full min-h-0 flex-col text-ads-ink">
      <header className="shrink-0 border-b border-ads-line/70 bg-ads-bg/72 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg leading-none font-semibold tracking-tight text-ads-ink">Реклама TikTok</h1>
            <p className="mt-0.5 truncate text-xs text-ads-subtle">Съёмка → эфир → смена кампании</p>
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
      <div className="mx-auto flex min-h-0 w-full max-w-[92rem] flex-col px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:h-full lg:pb-6">
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
            <div className={cn(scene !== "today" && "max-lg:hidden")}>
              <TodayQueue
                cars={cars}
                settings={settings}
                debts={settings.tiktokDebts || []}
                busyIds={busyIds}
                nextDueLabel={nextAirDateLabel(cars)}
                onRotate={handleSwitchCampaign}
                onMarkShot={handleMarkShot}
                onAir={handleSwitchCampaign}
                onDelete={executeDeleteCar}
                onClearDebt={(id) => void handleSaveDebts((settings.tiktokDebts || []).filter((d) => d.id !== id))}
                onOpenWarehouse={() => setWarehouseOpen(true)}
                onOpenAir={() => setScene("air")}
                onOpenShoot={() => setScene("shoot")}
              />
            </div>
            <div className={cn("flex min-h-0 flex-col", scene === "today" && "max-lg:hidden")}>
              <div className="mb-3 hidden gap-1 lg:flex">
                {(
                  [
                    ["air", "Эфир"],
                    ["shoot", "Съёмка"],
                    ["schedule", "График"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setScene(id)}
                    className={cn(
                      "h-8 rounded-full px-3 text-xs font-medium",
                      (scene === id || (scene === "today" && id === "air"))
                        ? "bg-ads-ink text-ads-paper"
                        : "bg-ads-surface text-ads-muted hover:text-ads-ink",
                    )}
                  >
                    {label}
                    {id === "shoot" && waitingCount ? ` · ${waitingCount}` : ""}
                    {id === "air" && airCount ? ` · ${airCount}` : ""}
                  </button>
                ))}
              </div>
              {(scene === "air" || scene === "today") && (
                <OnAirBoard cars={cars} settings={settings} busyIds={busyIds} {...handlers} />
              )}
              {scene === "shoot" && (
                <ShootBoard
                  cars={cars}
                  busyIds={busyIds}
                  onMarkShot={handleMarkShot}
                  onAir={handleSwitchCampaign}
                  onWaiting={(car) => void handleSwitchCampaign(car, "waiting_video")}
                  onDelete={executeDeleteCar}
                />
              )}
              {scene === "schedule" && (
                <SchedulePane
                  cars={cars}
                  settings={settings}
                  balancing={isBalancing}
                  onEqualize={() => void handleEqualizePreview()}
                  onVacation={() =>
                    setPostpone({
                      open: true,
                      mode: "vacation",
                      title: "Пауза графика",
                      hint: "Все ближайшие смены уедут вперёд. Эти дни будут пустые.",
                      minDateKey: getMinskDateKey(Date.now()),
                    })
                  }
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
              )}
            </div>
          </div>
        )}
      </div>
      </AdsScroller>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ads-line bg-ads-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-4 px-2 py-1.5">
          {(
            [
              ["today", "Сегодня", Sun, workCount],
              ["shoot", "Съёмка", Clapperboard, waitingCount],
              ["air", "Эфир", Radio, airCount],
              ["schedule", "График", CalendarDays, 0],
            ] as const
          ).map(([id, label, Icon, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => setScene(id)}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-medium",
                scene === id ? "text-ads-ink" : "text-ads-subtle",
              )}
            >
              <span className="relative">
                <Icon className="size-5" strokeWidth={1.5} />
                {count > 0 ? (
                  <span className="absolute -top-1 -right-2 min-w-4 rounded-full bg-ads-danger px-1 text-[9px] font-semibold text-white">
                    {count}
                  </span>
                ) : null}
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {toast && (
        <div
          className={`fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-ads-paper shadow-ads-float lg:bottom-6 ${
            toast.type === "error" ? "bg-ads-danger" : "bg-ads-ink"
          }`}
        >
          <span>{toast.text}</span>
          {toast.undo ? (
            <button
              type="button"
              className="text-xs font-semibold underline"
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              Отменить
            </button>
          ) : null}
        </div>
      )}

      {hints ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={closeHints} aria-label="Закрыть" />
          <div className="ads-enter relative m-4 w-full max-w-md rounded-3xl bg-ads-card p-6 shadow-ads-float">
            <p className="text-xs font-medium text-ads-subtle">
              {hintStep + 1} / {HINTS.length}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-ads-ink">{HINTS[hintStep].title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ads-muted">{HINTS[hintStep].text}</p>
            <div className="mt-5 flex justify-end gap-2">
              <GhostBtn className="h-9 px-3 text-xs" onClick={closeHints}>
                Пропустить
              </GhostBtn>
              <PrimaryBtn
                className="h-9 px-4"
                onClick={() => {
                  if (hintStep >= HINTS.length - 1) closeHints();
                  else setHintStep((s) => s + 1);
                }}
              >
                {hintStep >= HINTS.length - 1 ? "Понятно" : "Дальше"}
              </PrimaryBtn>
            </div>
          </div>
        </div>
      ) : null}

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
        onMarkShot={(car) => void handleMarkShot(car)}
      />
      <ConfirmSheet
        open={equalize.open}
        title="Выровнять К1 и К2"
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
