"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  getAdCars,
  createAdCar,
  updateAdCar,
  switchAdCarCampaign,
  resetAdCarTimer,
  deleteAdCar,
  getAdsSettings,
  updateAdsSettings,
  calculateDaysInAd,
  calculatePriceTier,
  getPriceTierLabel,
  DEFAULT_ADS_SETTINGS,
} from "@/lib/services/adsService";
import { AdCar, AdCampaignType, AdPriceTier, AdsSettings } from "@/lib/types";
import { AddAdCarModal } from "./AddAdCarModal";
import { AdsSettingsModal } from "./AdsSettingsModal";
import { RotationTimeline } from "./RotationTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Megaphone,
  Plus,
  Settings,
  Search,
  RotateCw,
  ArrowRight,
  ArrowLeft,
  Video,
  Trash2,
  Clock,
  AlertCircle,
  Car,
  ChevronDown,
  Play,
  Filter,
  LayoutGrid,
  Columns,
  ChevronUp,
  Check,
  X,
  CheckCircle2,
  Pencil,
} from "lucide-react";

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
    return `${d.getDate()} ${months[d.getMonth()]}`;
  } catch {
    return "";
  }
}

const TIERS: AdPriceTier[] = [
  "tier_under_7k",
  "tier_7k_13k",
  "tier_13k_20k",
  "tier_20k_plus",
];

const QUICK_DAY_PRESETS = [7, 10, 14, 21, 30];

export function AdsDashboard() {
  const [cars, setCars] = useState<AdCar[]>([]);
  const [catalogCars, setCatalogCars] = useState<CatalogCar[]>([]);
  const [settings, setSettings] = useState<AdsSettings>(DEFAULT_ADS_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [addingCarId, setAddingCarId] = useState<string | null>(null);

  // Inline Confirmation Popovers
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null);

  // Inline Days Edit Popover
  const [editingDaysCarId, setEditingDaysCarId] = useState<string | null>(null);
  const [editingDaysValue, setEditingDaysValue] = useState<number>(14);

  // Internal Toast / Banner Message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  // View Mode: "board" (Kanban by price tiers) vs "grid" (General grid)
  const [viewMode, setViewMode] = useState<"board" | "grid">("board");

  // Board campaign tab: "rk1" | "rk2" | "waiting"
  const [boardCampaign, setBoardCampaign] = useState<AdCampaignType>("rk1");

  // Collapsed warehouse sections per tier
  const [collapsedWarehouse, setCollapsedWarehouse] = useState<Record<string, boolean>>({});

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Grid Filters & Tabs
  const [gridTab, setGridTab] = useState<"all" | "rk1" | "rk2" | "waiting" | "expired">("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"urgent" | "newest" | "price_asc" | "price_desc">("urgent");

  // Custom Dropdowns State
  const [isTierDropdownOpen, setIsTierDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const tierRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: "error" | "success" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // Close dropdowns and popovers on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tierRef.current && !tierRef.current.contains(e.target as Node)) {
        setIsTierDropdownOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load ad cars, catalog cars and settings
  const loadData = async () => {
    try {
      const [fetchedCars, fetchedSettings, catalogRes] = await Promise.all([
        getAdCars(),
        getAdsSettings(),
        fetch("/api/catalog/cars").then((r) => r.json()).catch(() => ({ cars: [] })),
      ]);
      setCars(fetchedCars);
      setSettings(fetchedSettings);
      if (catalogRes?.success && Array.isArray(catalogRes.cars)) {
        setCatalogCars(catalogRes.cars);
      }
    } catch (err) {
      console.error("Error loading ads data:", err);
      showToast("Не удалось загрузить данные рекламы", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, []);

  // Staggering Engine: Calculate optimal days to balance rotation load
  const calculateOptimalMaxDays = (targetCampaign: AdCampaignType) => {
    const defaultDays = targetCampaign === "rk1" ? settings.rk1Days : targetCampaign === "rk2" ? settings.rk2Days : 0;
    if (defaultDays === 0) return 0; // for waiting_video
    
    const targetPerDay = settings.targetCarsPerDay || 3;
    const activeAdCars = cars.filter(c => c.campaign === "rk1" || c.campaign === "rk2");
    
    // Count expirations per day offset
    const expCounts: Record<number, number> = {};
    activeAdCars.forEach(c => {
      const limitDays = c.maxDays || (c.campaign === "rk1" ? settings.rk1Days : settings.rk2Days);
      const daysIn = calculateDaysInAd(c.startedAt);
      const offset = Math.max(0, limitDays - daysIn);
      expCounts[offset] = (expCounts[offset] || 0) + 1;
    });

    // Spiral search: check base day, then +/- 1, +/- 2, up to max deviation
    const MAX_DEVIATION = 5;
    for (let radius = 0; radius <= MAX_DEVIATION; radius++) {
      for (const sign of [1, -1]) {
        if (radius === 0 && sign === -1) continue;
        const testOffset = defaultDays + (radius * sign);
        if (testOffset < 1) continue;
        
        const count = expCounts[testOffset] || 0;
        if (count < targetPerDay) {
          return testOffset; // Found an optimal slot
        }
      }
    }
    
    return defaultDays; // Fallback if fully saturated
  };

  // Actions
  const handleAddCar = async (carData: Omit<AdCar, "id" | "createdAt" | "updatedAt">) => {
    const newCar = await createAdCar(carData);
    setCars((prev) => [newCar, ...prev]);
    showToast(`Автомобиль "${carData.name}" добавлен в рекламу`);
  };

  // Quick 1-click add from warehouse column
  const handleQuickAddWarehouseCar = async (
    catalogCar: CatalogCar,
    targetCampaign: AdCampaignType
  ) => {
    try {
      setAddingCarId(catalogCar.id);
      const tier = calculatePriceTier(catalogCar.priceUsd);
      const maxDays = calculateOptimalMaxDays(targetCampaign);

      const newCar = await createAdCar({
        carId: catalogCar.id,
        name: catalogCar.name,
        year: catalogCar.year ? String(catalogCar.year) : undefined,
        priceUsd: catalogCar.priceUsd,
        priceTier: tier,
        campaign: targetCampaign,
        startedAt: Date.now(),
        maxDays,
        photoUrl: catalogCar.photoUrl,
      });

      setCars((prev) => [newCar, ...prev]);
      const targetLabel = targetCampaign === "rk1" ? "РК 1" : targetCampaign === "rk2" ? "РК 2" : "Очередь съёмки";
      showToast(`"${catalogCar.name}" добавлен в ${targetLabel}`);
    } catch (err: any) {
      console.error("Error quick adding car:", err);
      showToast(err?.message || "Ошибка при добавлении авто", "error");
    } finally {
      setAddingCarId(null);
    }
  };

  const handleSwitchCampaign = async (car: AdCar, targetCampaign: AdCampaignType) => {
    if (!car.id) return;
    
    // Auto-calculate optimal days if moving TO an active ad campaign
    // If we're keeping custom days, we might want to respect them, but since we are switching campaigns, 
    // it's better to reset to optimal for the new campaign.
    const customDays = calculateOptimalMaxDays(targetCampaign);
    
    await switchAdCarCampaign(car.id, targetCampaign, customDays);
    setCars((prev) =>
      prev.map((c) =>
        c.id === car.id
          ? {
              ...c,
              campaign: targetCampaign,
              startedAt: Date.now(),
              maxDays: customDays,
              lastAlertSentAt: null as any,
            }
          : c
      )
    );
    const targetLabel = targetCampaign === "rk1" ? "РК 1" : targetCampaign === "rk2" ? "РК 2" : "Очередь съёмки";
    showToast(`Перенесено в ${targetLabel}: ${car.name}`);
  };

  const handleSaveCarDays = async (car: AdCar, newDays: number) => {
    if (!car.id || !newDays || newDays <= 0) return;
    try {
      setEditingDaysCarId(null);
      await updateAdCar(car.id, { maxDays: newDays });
      setCars((prev) =>
        prev.map((c) => (c.id === car.id ? { ...c, maxDays: newDays } : c))
      );
      showToast(`Срок для "${car.name}" установлен на ${newDays} дн.`);
    } catch (err: any) {
      console.error("Error updating car days:", err);
      showToast("Не удалось сохранить срок", "error");
    }
  };

  const executeResetTimer = async (car: AdCar) => {
    if (!car.id) return;
    setConfirmResetId(null);
    await resetAdCarTimer(car.id);
    setCars((prev) =>
      prev.map((c) =>
        c.id === car.id
          ? { ...c, startedAt: Date.now(), lastAlertSentAt: null as any }
          : c
      )
    );
    showToast(`Таймер сброшен на 0 дней: ${car.name}`);
  };

  const executeDeleteCar = async (car: AdCar) => {
    if (!car.id) return;
    setConfirmDeleteId(null);
    await deleteAdCar(car.id);
    setCars((prev) => prev.filter((c) => c.id !== car.id));
    showToast(`Автомобиль "${car.name}" удален из рекламы`);
  };

  const handleSaveSettings = async (newSettings: Partial<AdsSettings>) => {
    await updateAdsSettings(newSettings);
    setSettings((prev) => ({ ...prev, ...newSettings }));
    showToast("Настройки сроков сохранены");
  };

  const toggleWarehouseCollapse = (tier: string) => {
    setCollapsedWarehouse((prev) => ({
      ...prev,
      [tier]: !prev[tier],
    }));
  };

  // Helper stats
  const stats = useMemo(() => {
    const total = cars.length;
    const rk1Count = cars.filter((c) => c.campaign === "rk1").length;
    const rk2Count = cars.filter((c) => c.campaign === "rk2").length;
    const waitingCount = cars.filter((c) => c.campaign === "waiting_video").length;

    const expiredCars = cars.filter((c) => {
      if (c.campaign === "waiting_video") return false;
      const days = calculateDaysInAd(c.startedAt);
      const limit = c.maxDays || (c.campaign === "rk1" ? settings.rk1Days : settings.rk2Days);
      return days >= limit;
    });

    return {
      total,
      rk1Count,
      rk2Count,
      waitingCount,
      expiredCount: expiredCars.length,
    };
  }, [cars, settings]);

  const tierOptions = [
    { value: "all", label: "Все ценовые группы" },
    { value: "tier_under_7k", label: "До $7 000" },
    { value: "tier_7k_13k", label: "$7 000 – $13 000" },
    { value: "tier_13k_20k", label: "$13 000 – $20 000" },
    { value: "tier_20k_plus", label: "$20 000+" },
  ];

  const sortOptions = [
    { value: "urgent", label: "Сначала требующие ротации" },
    { value: "newest", label: "Сначала новые" },
    { value: "price_asc", label: "Цена: по возрастанию" },
    { value: "price_desc", label: "Цена: по убыванию" },
  ];

  // All active tracked cars across ALL campaigns (РК 1, РК 2, Ожидают съёмки)
  const activeCarFilterAcrossAllAds = useMemo(() => {
    const idSet = new Set<string>();
    const nameSet = new Set<string>();

    cars.forEach((c) => {
      if (c.carId) idSet.add(c.carId);
      if (c.id) idSet.add(c.id);
      if (c.name) nameSet.add(c.name.trim().toLowerCase());
    });

    return { idSet, nameSet };
  }, [cars]);

  // Grouped active ad cars by tier for the current Board campaign
  const boardAdCarsByTier = useMemo(() => {
    const map: Record<AdPriceTier, AdCar[]> = {
      tier_under_7k: [],
      tier_7k_13k: [],
      tier_13k_20k: [],
      tier_20k_plus: [],
    };

    const query = searchQuery.toLowerCase().trim();

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
        if (map[tier]) {
          map[tier].push(c);
        }
      });

    return map;
  }, [cars, boardCampaign, searchQuery]);

  // Grouped available warehouse catalog cars by tier (excluded if already in ANY campaign)
  const boardWarehouseCarsByTier = useMemo(() => {
    const map: Record<AdPriceTier, CatalogCar[]> = {
      tier_under_7k: [],
      tier_7k_13k: [],
      tier_13k_20k: [],
      tier_20k_plus: [],
    };

    const query = searchQuery.toLowerCase().trim();

    catalogCars
      .filter((c) => {
        if (activeCarFilterAcrossAllAds.idSet.has(c.id)) return false;
        if (activeCarFilterAcrossAllAds.nameSet.has(c.name.trim().toLowerCase())) return false;
        return true;
      })
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
        if (map[tier]) {
          map[tier].push(c);
        }
      });

    return map;
  }, [catalogCars, activeCarFilterAcrossAllAds, searchQuery]);

  // Filtered & Sorted Cars for Grid View
  const displayedGridCars = useMemo(() => {
    return cars
      .filter((car) => {
        if (gridTab === "rk1" && car.campaign !== "rk1") return false;
        if (gridTab === "rk2" && car.campaign !== "rk2") return false;
        if (gridTab === "waiting" && car.campaign !== "waiting_video") return false;
        if (gridTab === "expired") {
          if (car.campaign === "waiting_video") return false;
          const days = calculateDaysInAd(car.startedAt);
          const limit = car.maxDays || (car.campaign === "rk1" ? settings.rk1Days : settings.rk2Days);
          if (days < limit) return false;
        }

        if (selectedTier !== "all" && car.priceTier !== selectedTier) return false;

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const nameMatch = car.name.toLowerCase().includes(query);
          const yearMatch = String(car.year || "").includes(query);
          const priceMatch = String(car.priceUsd).includes(query);
          if (!nameMatch && !yearMatch && !priceMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "urgent") {
          const daysA = calculateDaysInAd(a.startedAt);
          const limitA = a.maxDays || (a.campaign === "rk1" ? settings.rk1Days : settings.rk2Days);
          const ratioA = a.campaign === "waiting_video" ? -1 : daysA / limitA;

          const daysB = calculateDaysInAd(b.startedAt);
          const limitB = b.maxDays || (b.campaign === "rk1" ? settings.rk1Days : settings.rk2Days);
          const ratioB = b.campaign === "waiting_video" ? -1 : daysB / limitB;

          return ratioB - ratioA;
        }
        if (sortBy === "newest") {
          return b.createdAt - a.createdAt;
        }
        if (sortBy === "price_asc") {
          return a.priceUsd - b.priceUsd;
        }
        if (sortBy === "price_desc") {
          return b.priceUsd - a.priceUsd;
        }
        return 0;
      });
  }, [cars, gridTab, selectedTier, searchQuery, sortBy, settings]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans">
      {/* Top Header */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4 sticky top-0 z-20 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-[1600px] mx-auto">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-zinc-800" />
                Реклама TikTok Ads
              </h1>
              {stats.expiredCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                  {stats.expiredCount} требуют ротации
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Управление группами рекламы, ротация и подбор авто со склада по ценовым категориям
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200/60">
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === "board"
                    ? "bg-white text-zinc-900 shadow-xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                Столбцы TikTok
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-zinc-900 shadow-xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Общий список
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsModalOpen(true)}
              className="bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium rounded-xl h-9 gap-1.5 shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-500" />
              Сроки
            </Button>

            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-xl h-9 gap-1.5 px-3.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Добавить авто
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto w-full space-y-6 flex-1">
        {/* ========================================================= */}
        {/* MODE 1: KANBAN BOARD BY TIKTOK PRICE TIERS                */}
        {/* ========================================================= */}
        {viewMode === "board" && (
          <div className="space-y-5">
            {/* Board Campaign Navigation & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 bg-zinc-100/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setBoardCampaign("rk1")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    boardCampaign === "rk1"
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span>РК 1</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                      boardCampaign === "rk1"
                        ? "bg-white/20 text-white"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {stats.rk1Count}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBoardCampaign("rk2")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    boardCampaign === "rk2"
                      ? "bg-purple-600 text-white font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span>РК 2</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                      boardCampaign === "rk2"
                        ? "bg-white/20 text-white"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {stats.rk2Count}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBoardCampaign("waiting_video")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    boardCampaign === "waiting_video"
                      ? "bg-amber-600 text-white font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span>Ожидают съёмки</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                      boardCampaign === "waiting_video"
                        ? "bg-white/20 text-white"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {stats.waitingCount}
                  </span>
                </button>
              </div>

              <div className="relative sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Глобальный поиск по всем столбцам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 h-9 text-xs rounded-xl focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-700 rounded-full hover:bg-zinc-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <RotationTimeline cars={cars} settings={settings} />

            {/* 4 Columns Board */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-2">
                <Spinner className="w-6 h-6 text-zinc-600" />
                <p className="text-xs">Загрузка доски TikTok...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                {TIERS.map((tierKey) => {
                  const tierAdCars = boardAdCarsByTier[tierKey] || [];
                  const tierWarehouseCars = boardWarehouseCarsByTier[tierKey] || [];
                  const isSearching = searchQuery.trim().length > 0;
                  const totalMatches = tierAdCars.length + tierWarehouseCars.length;
                  const hasMatches = isSearching && totalMatches > 0;
                  const isWarehouseCollapsed = isSearching ? false : !!collapsedWarehouse[tierKey];

                  return (
                    <div
                      key={tierKey}
                      className={`bg-white rounded-2xl border transition-all flex flex-col overflow-hidden ${
                        hasMatches
                          ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                          : "border-zinc-200/80 shadow-2xs"
                      }`}
                    >
                      {/* Column Header */}
                      <div
                        className={`p-4 border-b flex items-center justify-between transition-colors ${
                          hasMatches
                            ? "bg-blue-50/60 border-blue-200"
                            : "bg-zinc-50/70 border-zinc-100"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-xs text-zinc-900 tracking-tight flex items-center gap-1.5">
                            <span>{getPriceTierLabel(tierKey)}</span>
                            {hasMatches && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white animate-pulse">
                                Найдено: {totalMatches}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5">
                            <span className="font-medium text-zinc-800">{tierAdCars.length} в рекламе</span>
                            <span>•</span>
                            <span>{tierWarehouseCars.length} на складе</span>
                          </div>
                        </div>

                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            hasMatches ? "bg-blue-600" : "bg-zinc-300"
                          }`}
                        />
                      </div>

                      {/* Section 1: Active Ads in this Tier */}
                      <div className="p-2.5 space-y-2 min-h-[120px] bg-zinc-50/30">
                        <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-1 flex items-center justify-between">
                          <span>В рекламе • {tierAdCars.length}</span>
                        </div>

                        {tierAdCars.length === 0 ? (
                          <div className="p-4 text-center rounded-xl border border-dashed border-zinc-200 bg-white/60 text-zinc-400">
                            <Car className="w-4 h-4 mx-auto mb-1 opacity-40" />
                            <p className="text-xs">
                              {isSearching ? "Ничего не найдено в рекламе" : "Нет авто в этой группе"}
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-0.5">
                              {isSearching ? "Проверьте список склада ниже" : "Добавьте из списка склада ниже"}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {tierAdCars.map((car) => {
                              const daysInAd = calculateDaysInAd(car.startedAt);
                              const limitDays =
                                car.maxDays ||
                                (car.campaign === "rk1"
                                  ? settings.rk1Days
                                  : car.campaign === "rk2"
                                  ? settings.rk2Days
                                  : 0);

                              const isExpired = car.campaign !== "waiting_video" && daysInAd >= limitDays;
                              const progressPercent =
                                car.campaign === "waiting_video" || limitDays === 0
                                  ? 0
                                  : Math.min(100, Math.round((daysInAd / limitDays) * 100));

                              return (
                                <div
                                  key={car.id}
                                  className={`rounded-xl border bg-white p-2.5 space-y-2 shadow-2xs transition-all ${
                                    isSearching
                                      ? "border-blue-400 ring-2 ring-blue-500/30 bg-blue-50/20"
                                      : isExpired
                                      ? "border-rose-300 ring-1 ring-rose-200"
                                      : "border-zinc-200/80 hover:border-zinc-300"
                                  }`}
                                >
                                  {/* Line 1: Thumbnail + Title & Year + Price */}
                                  <div className="flex items-center gap-2">
                                    {car.photoUrl ? (
                                      <img
                                        src={car.photoUrl}
                                        alt={car.name}
                                        className="w-9 h-7 object-cover rounded-md bg-zinc-100 flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-9 h-7 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0 text-zinc-400">
                                        <Car className="w-3 h-3" />
                                      </div>
                                    )}

                                    <div className="min-w-0 flex-1 flex items-center justify-between gap-1.5">
                                      <div className="min-w-0">
                                        <div className="font-semibold text-xs text-zinc-900 truncate flex items-center gap-1">
                                          <span className="truncate">{car.name}</span>
                                          {car.year && (
                                            <span className="text-[10px] text-zinc-400 font-normal shrink-0">
                                              {car.year} г.
                                            </span>
                                          )}
                                          {isSearching && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white shrink-0">
                                              Найдено
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="font-bold text-xs text-zinc-900 shrink-0">
                                        ${Number(car.priceUsd).toLocaleString("ru-RU")}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Line 2: Days in ad pill (editable!) + Fast action button + Icons */}
                                  <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-zinc-100">
                                    {/* Days Status Pill with Clickable Popover Editor */}
                                    {car.campaign !== "waiting_video" ? (
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConfirmDeleteId(null);
                                            setConfirmResetId(null);
                                            if (editingDaysCarId === car.id) {
                                              setEditingDaysCarId(null);
                                            } else {
                                              setEditingDaysCarId(car.id || null);
                                              setEditingDaysValue(limitDays);
                                            }
                                          }}
                                          className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md transition-all hover:ring-1 hover:ring-zinc-400 cursor-pointer ${
                                            isExpired
                                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                                              : progressPercent > 70
                                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                                              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                                          }`}
                                          title="Нажмите, чтобы изменить срок (дней)"
                                        >
                                          <Clock className="w-2.5 h-2.5 opacity-60" />
                                          <span>{daysInAd} / {limitDays} дн.</span>
                                          <Pencil className="w-2 h-2 opacity-50 ml-0.5" />
                                        </button>

                                        {/* Inline Days Editor Popover */}
                                        {editingDaysCarId === car.id && (
                                          <div className="absolute left-0 bottom-full mb-1.5 z-50 w-56 p-3 bg-white border border-zinc-200 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150 text-xs">
                                            <div className="font-semibold text-zinc-900 leading-tight">Срок в рекламе</div>
                                            <div className="text-[10px] text-zinc-500 mt-0.5">Лимит дней для {car.name}</div>
                                            
                                            {/* Quick preset buttons */}
                                            <div className="flex items-center gap-1 mt-2 mb-2">
                                              {QUICK_DAY_PRESETS.map((p) => (
                                                <button
                                                  key={p}
                                                  type="button"
                                                  onClick={() => setEditingDaysValue(p)}
                                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                                    editingDaysValue === p
                                                      ? "bg-zinc-900 text-white font-bold"
                                                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                                  }`}
                                                >
                                                  {p}д
                                                </button>
                                              ))}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                              <input
                                                type="number"
                                                min={1}
                                                max={90}
                                                value={editingDaysValue}
                                                onChange={(e) => setEditingDaysValue(Number(e.target.value))}
                                                className="w-14 h-7 px-2 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900 bg-zinc-50 focus:bg-white"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") handleSaveCarDays(car, editingDaysValue);
                                                  if (e.key === "Escape") setEditingDaysCarId(null);
                                                }}
                                              />
                                              <span className="text-zinc-500 text-xs">дн.</span>
                                              <div className="flex items-center gap-1 ml-auto">
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingDaysCarId(null)}
                                                  className="px-2 h-7 text-[11px] text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                                                >
                                                  Отмена
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleSaveCarDays(car, editingDaysValue)}
                                                  className="px-2.5 h-7 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                                                >
                                                  OK
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-medium">
                                        <Video className="w-2.5 h-2.5 text-amber-600" />
                                        На съёмке
                                      </span>
                                    )}

                                    {/* Actions & Utilities */}
                                    <div className="flex items-center gap-1 ml-auto">
                                      {car.campaign === "rk1" && (
                                        <button
                                          type="button"
                                          onClick={() => handleSwitchCampaign(car, "rk2")}
                                          className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] h-6 px-2 rounded-md font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                                        >
                                          <ArrowRight className="w-2.5 h-2.5" />
                                          В РК 2
                                        </button>
                                      )}

                                      {car.campaign === "rk2" && (
                                        <button
                                          type="button"
                                          onClick={() => handleSwitchCampaign(car, "rk1")}
                                          className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] h-6 px-2 rounded-md font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                                        >
                                          <ArrowLeft className="w-2.5 h-2.5" />
                                          В РК 1
                                        </button>
                                      )}

                                      {car.campaign === "waiting_video" && (
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleSwitchCampaign(car, "rk1")}
                                            className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] h-6 px-1.5 rounded-md font-semibold"
                                          >
                                            В РК 1
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSwitchCampaign(car, "rk2")}
                                            className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] h-6 px-1.5 rounded-md font-semibold"
                                          >
                                            В РК 2
                                          </button>
                                        </div>
                                      )}

                                      {/* Inline Reset Timer Popover */}
                                      {car.campaign !== "waiting_video" && (
                                        <div className="relative">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingDaysCarId(null);
                                              setConfirmDeleteId(null);
                                              setConfirmResetId(confirmResetId === car.id ? null : car.id || null);
                                            }}
                                            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                                            title="Сбросить таймер на 0"
                                          >
                                            <RotateCw className="w-3 h-3" />
                                          </button>

                                          {confirmResetId === car.id && (
                                            <div className="absolute right-0 bottom-full mb-1.5 z-40 w-48 p-2.5 bg-white border border-zinc-200 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150 text-xs">
                                              <div className="font-semibold text-zinc-900 leading-tight">Сбросить таймер?</div>
                                              <div className="text-[11px] text-zinc-500 mt-0.5">Отсчет начнется с 0 дней</div>
                                              <div className="flex items-center justify-end gap-1.5 mt-2">
                                                <button
                                                  type="button"
                                                  onClick={() => setConfirmResetId(null)}
                                                  className="px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
                                                >
                                                  Отмена
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => executeResetTimer(car)}
                                                  className="px-2.5 py-0.5 text-[11px] font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-md shadow-2xs transition-colors"
                                                >
                                                  Сбросить
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Inline Delete Popover */}
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingDaysCarId(null);
                                            setConfirmResetId(null);
                                            setConfirmDeleteId(confirmDeleteId === car.id ? null : car.id || null);
                                          }}
                                          className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                          title="Удалить из рекламы"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>

                                        {confirmDeleteId === car.id && (
                                          <div className="absolute right-0 bottom-full mb-1.5 z-40 w-48 p-2.5 bg-white border border-zinc-200 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150 text-xs">
                                            <div className="font-semibold text-zinc-900 leading-tight">Удалить из рекламы?</div>
                                            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{car.name}</div>
                                            <div className="flex items-center justify-end gap-1.5 mt-2">
                                              <button
                                                type="button"
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
                                              >
                                                Отмена
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => executeDeleteCar(car)}
                                                className="px-2.5 py-0.5 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-2xs transition-colors"
                                              >
                                                Удалить
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Available on Warehouse (Collapsible with 1-click + Add) */}
                      <div className="border-t border-zinc-200 bg-white">
                        <button
                          type="button"
                          onClick={() => toggleWarehouseCollapse(tierKey)}
                          className="w-full px-3 py-2.5 text-left text-xs font-semibold text-zinc-800 hover:bg-zinc-50 flex items-center justify-between transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <span>Со склада</span>
                            <span className="text-[11px] text-zinc-500 font-normal">
                              • {tierWarehouseCars.length}
                            </span>
                          </span>
                          {isWarehouseCollapsed ? (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                          )}
                        </button>

                        {!isWarehouseCollapsed && (
                          <div className="px-3 pb-3 space-y-2 max-h-72 overflow-y-auto">
                            {tierWarehouseCars.length === 0 ? (
                              <div className="text-[11px] text-zinc-400 text-center py-4">
                                {isSearching
                                  ? "Нет совпадений на складе"
                                  : "Нет свободных авто этой группы на складе"}
                              </div>
                            ) : (
                              tierWarehouseCars.map((wCar) => {
                                const isAdding = addingCarId === wCar.id;
                                const addedDateText = formatCarAddedDate(wCar.createdAt);

                                return (
                                  <div
                                    key={wCar.id}
                                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                                      isSearching
                                        ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/40 shadow-xs"
                                        : "border-zinc-200/70 bg-zinc-50/50 hover:bg-zinc-50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {wCar.photoUrl ? (
                                        <img
                                          src={wCar.photoUrl}
                                          alt={wCar.name}
                                          className="w-9 h-7 object-cover rounded-md bg-zinc-100 flex-shrink-0"
                                        />
                                      ) : (
                                        <div className="w-9 h-7 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0 text-zinc-400">
                                          <Car className="w-3 h-3" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="font-semibold text-xs text-zinc-900 truncate flex items-center gap-1.5">
                                          <span className="truncate">{wCar.name}</span>
                                          {wCar.year ? (
                                            <span className="text-[11px] font-normal text-zinc-500 shrink-0">
                                              {wCar.year} г.
                                            </span>
                                          ) : null}
                                          {isSearching && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white shrink-0">
                                              Найдено
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                                          <span className="font-bold text-zinc-800">
                                            ${Number(wCar.priceUsd).toLocaleString("ru-RU")}
                                          </span>
                                          {addedDateText && (
                                            <>
                                              <span>•</span>
                                              <span>{addedDateText}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* 1-Click Add Button */}
                                    <button
                                      type="button"
                                      disabled={isAdding}
                                      onClick={() => handleQuickAddWarehouseCar(wCar, boardCampaign)}
                                      className="p-1.5 ml-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center shadow-2xs flex-shrink-0 disabled:opacity-50"
                                      title={`Добавить ${wCar.name} в ${boardCampaign === "rk1" ? "РК 1" : boardCampaign === "rk2" ? "РК 2" : "Очередь съёмки"}`}
                                    >
                                      {isAdding ? (
                                        <Spinner className="w-3.5 h-3.5" />
                                      ) : (
                                        <Plus className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 2: GENERAL GRID VIEW (CLASSIC LIST)                   */}
        {/* ========================================================= */}
        {viewMode === "grid" && (
          <div className="space-y-6">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div
                onClick={() => setGridTab("all")}
                className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                  gridTab === "all"
                    ? "border-zinc-900 ring-1 ring-zinc-900 shadow-xs"
                    : "border-zinc-200/80 hover:border-zinc-300 shadow-2xs"
                }`}
              >
                <div className="text-xs font-medium text-zinc-500">Всего в рекламе</div>
                <div className="text-2xl font-bold text-zinc-900 mt-1">{stats.total}</div>
              </div>

              <div
                onClick={() => setGridTab("rk1")}
                className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                  gridTab === "rk1"
                    ? "border-blue-600 ring-1 ring-blue-600 shadow-xs"
                    : "border-zinc-200/80 hover:border-zinc-300 shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-medium text-blue-700">
                  <span>РК 1</span>
                  <span className="text-[11px] font-normal text-zinc-400">
                    {settings.rk1Days} дн.
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-700 mt-1">{stats.rk1Count}</div>
              </div>

              <div
                onClick={() => setGridTab("rk2")}
                className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                  gridTab === "rk2"
                    ? "border-purple-600 ring-1 ring-purple-600 shadow-xs"
                    : "border-zinc-200/80 hover:border-zinc-300 shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-medium text-purple-700">
                  <span>РК 2</span>
                  <span className="text-[11px] font-normal text-zinc-400">
                    {settings.rk2Days} дн.
                  </span>
                </div>
                <div className="text-2xl font-bold text-purple-700 mt-1">{stats.rk2Count}</div>
              </div>

              <div
                onClick={() => setGridTab("waiting")}
                className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                  gridTab === "waiting"
                    ? "border-amber-600 ring-1 ring-amber-600 shadow-xs"
                    : "border-zinc-200/80 hover:border-zinc-300 shadow-2xs"
                }`}
              >
                <div className="text-xs font-medium text-amber-700">Ожидают съёмки</div>
                <div className="text-2xl font-bold text-amber-700 mt-1">{stats.waitingCount}</div>
              </div>

              <div
                onClick={() => setGridTab("expired")}
                className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                  gridTab === "expired"
                    ? "border-rose-600 ring-1 ring-rose-600 shadow-xs"
                    : stats.expiredCount > 0
                    ? "border-rose-200 bg-rose-50/40 hover:border-rose-300"
                    : "border-zinc-200/80 hover:border-zinc-300 shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-medium text-rose-700">
                  <span>Требуют ротации</span>
                  {stats.expiredCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </div>
                <div className="text-2xl font-bold text-rose-700 mt-1">{stats.expiredCount}</div>
              </div>
            </div>

            {/* Filter and Control Bar */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs">
              {/* Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setGridTab("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    gridTab === "all"
                      ? "bg-white text-zinc-900 shadow-xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Все • {stats.total}
                </button>
                <button
                  type="button"
                  onClick={() => setGridTab("rk1")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    gridTab === "rk1"
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  РК 1 • {stats.rk1Count}
                </button>
                <button
                  type="button"
                  onClick={() => setGridTab("rk2")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    gridTab === "rk2"
                      ? "bg-purple-600 text-white font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  РК 2 • {stats.rk2Count}
                </button>
                <button
                  type="button"
                  onClick={() => setGridTab("waiting")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    gridTab === "waiting"
                      ? "bg-amber-600 text-white font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Ожидают • {stats.waitingCount}
                </button>
                <button
                  type="button"
                  onClick={() => setGridTab("expired")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    gridTab === "expired"
                      ? "bg-rose-600 text-white font-semibold shadow-xs"
                      : "text-rose-700 hover:text-rose-900"
                  }`}
                >
                  Срок вышел • {stats.expiredCount}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Custom Tier Dropdown */}
                <div className="relative" ref={tierRef}>
                  <button
                    type="button"
                    onClick={() => setIsTierDropdownOpen(!isTierDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium h-9 transition-colors shadow-2xs"
                  >
                    <Filter className="w-3.5 h-3.5 text-zinc-400" />
                    <span>
                      {tierOptions.find((t) => t.value === selectedTier)?.label || "Ценовая группа"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-1" />
                  </button>

                  {isTierDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                      {tierOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSelectedTier(opt.value);
                            setIsTierDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 transition-colors flex items-center justify-between ${
                            selectedTier === opt.value
                              ? "bg-zinc-100 text-zinc-900 font-semibold"
                              : "text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Sort Dropdown */}
                <div className="relative" ref={sortRef}>
                  <button
                    type="button"
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium h-9 transition-colors shadow-2xs"
                  >
                    <span>
                      {sortOptions.find((s) => s.value === sortBy)?.label || "Сортировка"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  </button>

                  {isSortDropdownOpen && (
                    <div className="absolute right-0 mt-1.5 w-52 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                      {sortOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSortBy(opt.value as any);
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 transition-colors flex items-center justify-between ${
                            sortBy === opt.value
                              ? "bg-zinc-100 text-zinc-900 font-semibold"
                              : "text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search Input */}
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    type="text"
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 h-9 text-xs rounded-xl focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Cars Grid */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-2">
                <Spinner className="w-6 h-6 text-zinc-600" />
                <p className="text-xs">Загрузка автомобилей...</p>
              </div>
            ) : displayedGridCars.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-zinc-200/80 bg-white space-y-3">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-800">Автомобили не найдены</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                    {cars.length === 0
                      ? "В рекламе пока нет автомобилей. Добавьте первый автомобиль со склада сайта."
                      : "По выбранным критериям поиска ничего не найдено."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedGridCars.map((car) => {
                  const daysInAd = calculateDaysInAd(car.startedAt);
                  const limitDays =
                    car.maxDays ||
                    (car.campaign === "rk1"
                      ? settings.rk1Days
                      : car.campaign === "rk2"
                      ? settings.rk2Days
                      : 0);

                  const isExpired = car.campaign !== "waiting_video" && daysInAd >= limitDays;
                  const progressPercent =
                    car.campaign === "waiting_video" || limitDays === 0
                      ? 0
                      : Math.min(100, Math.round((daysInAd / limitDays) * 100));

                  return (
                    <div
                      key={car.id}
                      className={`rounded-2xl border bg-white flex flex-col overflow-hidden transition-all shadow-2xs hover:shadow-md ${
                        isExpired
                          ? "border-rose-300 ring-1 ring-rose-300"
                          : "border-zinc-200/80"
                      }`}
                    >
                      {/* Thumbnail & Badges */}
                      <div className="relative h-40 bg-zinc-100 flex items-center justify-center overflow-hidden border-b border-zinc-100">
                        {car.photoUrl ? (
                          <img
                            src={car.photoUrl}
                            alt={car.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-400 gap-1">
                            <Car className="w-8 h-8" />
                            <span className="text-[10px]">Нет фото</span>
                          </div>
                        )}

                        {/* Campaign Status Badge */}
                        <div className="absolute top-3 left-3">
                          {car.campaign === "rk1" && (
                            <span className="bg-blue-600 text-white font-semibold text-xs px-2.5 py-1 rounded-lg shadow-sm">
                              РК 1
                            </span>
                          )}
                          {car.campaign === "rk2" && (
                            <span className="bg-purple-600 text-white font-semibold text-xs px-2.5 py-1 rounded-lg shadow-sm">
                              РК 2
                            </span>
                          )}
                          {car.campaign === "waiting_video" && (
                            <span className="bg-amber-500 text-white font-semibold text-xs px-2.5 py-1 rounded-lg shadow-sm">
                              Ожидает съёмки
                            </span>
                          )}
                        </div>

                        {/* Price Tier Badge */}
                        <div className="absolute top-3 right-3">
                          <span className="bg-white/90 backdrop-blur-xs text-zinc-800 text-[11px] font-medium px-2 py-0.5 rounded-lg border border-zinc-200/60 shadow-xs">
                            {getPriceTierLabel(car.priceTier)}
                          </span>
                        </div>

                        {/* Expired Rotation Banner */}
                        {isExpired && (
                          <div className="absolute bottom-0 inset-x-0 bg-rose-600 text-white text-xs font-medium py-1 px-3 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Пора перенести в {car.campaign === "rk1" ? "РК 2" : "РК 1"}</span>
                            </div>
                            <span className="text-[11px] font-mono opacity-90">{daysInAd} дн.</span>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-sm text-zinc-900 leading-snug">
                                {car.name}
                              </h3>
                              {car.year && (
                                <span className="text-xs text-zinc-500 font-normal">
                                  {car.year} г.
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-zinc-900 text-sm">
                                ${Number(car.priceUsd).toLocaleString("ru-RU")}
                              </div>
                            </div>
                          </div>

                          {/* Day Counter & Progress (Clickable to Edit!) */}
                          {car.campaign !== "waiting_video" ? (
                            <div className="mt-3 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1.5 relative">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-500 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                                  В рекламе:
                                </span>
                                
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (editingDaysCarId === car.id) {
                                        setEditingDaysCarId(null);
                                      } else {
                                        setEditingDaysCarId(car.id || null);
                                        setEditingDaysValue(limitDays);
                                      }
                                    }}
                                    className={`font-semibold font-mono flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-zinc-200/80 transition-colors cursor-pointer ${
                                      isExpired
                                        ? "text-rose-700 font-bold"
                                        : progressPercent > 70
                                        ? "text-amber-700"
                                        : "text-zinc-800"
                                    }`}
                                    title="Нажмите, чтобы изменить срок"
                                  >
                                    <span>{daysInAd}-й день из {limitDays}</span>
                                    <Pencil className="w-2.5 h-2.5 opacity-40" />
                                  </button>

                                  {editingDaysCarId === car.id && (
                                    <div className="absolute right-0 bottom-full mb-1.5 z-50 w-56 p-3 bg-white border border-zinc-200 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150 text-xs">
                                      <div className="font-semibold text-zinc-900 leading-tight">Срок в рекламе</div>
                                      <div className="text-[10px] text-zinc-500 mt-0.5">Лимит дней для {car.name}</div>
                                      
                                      <div className="flex items-center gap-1 mt-2 mb-2">
                                        {QUICK_DAY_PRESETS.map((p) => (
                                          <button
                                            key={p}
                                            type="button"
                                            onClick={() => setEditingDaysValue(p)}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                              editingDaysValue === p
                                                ? "bg-zinc-900 text-white font-bold"
                                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                            }`}
                                          >
                                            {p}д
                                          </button>
                                        ))}
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="number"
                                          min={1}
                                          max={90}
                                          value={editingDaysValue}
                                          onChange={(e) => setEditingDaysValue(Number(e.target.value))}
                                          className="w-14 h-7 px-2 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900 bg-zinc-50 focus:bg-white"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveCarDays(car, editingDaysValue);
                                            if (e.key === "Escape") setEditingDaysCarId(null);
                                          }}
                                        />
                                        <span className="text-zinc-500 text-xs">дн.</span>
                                        <div className="flex items-center gap-1 ml-auto">
                                          <button
                                            type="button"
                                            onClick={() => setEditingDaysCarId(null)}
                                            className="px-2 h-7 text-[11px] text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                                          >
                                            Отмена
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSaveCarDays(car, editingDaysValue)}
                                            className="px-2.5 h-7 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                                          >
                                            OK
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isExpired
                                      ? "bg-rose-500"
                                      : progressPercent > 70
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between text-xs text-amber-900">
                              <span className="font-medium flex items-center gap-1.5">
                                <Video className="w-3.5 h-3.5 text-amber-600" />
                                Ожидает видео
                              </span>
                              <span className="text-[11px] text-amber-700">Таймер на паузе</span>
                            </div>
                          )}

                          {car.notes && (
                            <div className="mt-2 text-[11px] text-zinc-600 bg-zinc-50 p-2 rounded-lg border border-zinc-200/60 truncate">
                              {car.notes}
                            </div>
                          )}
                        </div>

                        {/* Actions with Inline Confirmation Popovers */}
                        <div className="pt-3 border-t border-zinc-100 flex flex-col gap-2 relative">
                          {car.campaign === "rk1" && (
                            <div className="grid grid-cols-2 gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleSwitchCampaign(car, "rk2")}
                                className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-8 font-medium rounded-lg flex items-center justify-center gap-1"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                                В РК 2
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSwitchCampaign(car, "waiting_video")}
                                className="border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs h-8 rounded-lg"
                              >
                                <Video className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                                На съёмку
                              </Button>
                            </div>
                          )}

                          {car.campaign === "rk2" && (
                            <div className="grid grid-cols-2 gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleSwitchCampaign(car, "rk1")}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 font-medium rounded-lg flex items-center justify-center gap-1"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                В РК 1
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSwitchCampaign(car, "waiting_video")}
                                className="border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs h-8 rounded-lg"
                              >
                                <Video className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                                На съёмку
                              </Button>
                            </div>
                          )}

                          {car.campaign === "waiting_video" && (
                            <div className="grid grid-cols-2 gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleSwitchCampaign(car, "rk1")}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 font-medium rounded-lg flex items-center justify-center gap-1"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                Запуск в РК 1
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSwitchCampaign(car, "rk2")}
                                className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-8 font-medium rounded-lg flex items-center justify-center gap-1"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                Запуск в РК 2
                              </Button>
                            </div>
                          )}

                          {/* Utilities with Inline Confirmation Popovers */}
                          <div className="flex items-center justify-between pt-1">
                            {car.campaign !== "waiting_video" ? (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDaysCarId(null);
                                    setConfirmDeleteId(null);
                                    setConfirmResetId(confirmResetId === car.id ? null : car.id || null);
                                  }}
                                  className="text-[11px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 transition-colors"
                                  title="Сбросить таймер на 0 дней"
                                >
                                  <RotateCw className="w-3 h-3 text-zinc-400" />
                                  Сбросить таймер
                                </button>

                                {confirmResetId === car.id && (
                                  <div className="absolute left-0 bottom-full mb-1.5 z-40 w-52 p-3 bg-white border border-zinc-200 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150 text-xs">
                                    <div className="font-semibold text-zinc-900 leading-tight">Сбросить таймер?</div>
                                    <div className="text-[11px] text-zinc-500 mt-0.5">Отсчет начнется с 0 дней</div>
                                    <div className="flex items-center justify-end gap-1.5 mt-2.5">
                                      <button
                                        type="button"
                                        onClick={() => setConfirmResetId(null)}
                                        className="px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                                      >
                                        Отмена
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => executeResetTimer(car)}
                                        className="px-3 py-1 text-[11px] font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-2xs transition-colors"
                                      >
                                        Сбросить
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div />
                            )}

                            <div className="relative ml-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDaysCarId(null);
                                  setConfirmResetId(null);
                                  setConfirmDeleteId(confirmDeleteId === car.id ? null : car.id || null);
                                }}
                                className="text-[11px] text-zinc-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                                title="Удалить из рекламы"
                              >
                                <Trash2 className="w-3 h-3" />
                                Удалить
                              </button>

                              {confirmDeleteId === car.id && (
                                <div className="absolute right-0 bottom-full mb-1.5 z-40 w-52 p-3 bg-white border border-zinc-200 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150 text-xs">
                                  <div className="font-semibold text-zinc-900 leading-tight">Удалить из рекламы?</div>
                                  <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{car.name}</div>
                                  <div className="flex items-center justify-end gap-1.5 mt-2.5">
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                                    >
                                      Отмена
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => executeDeleteCar(car)}
                                      className="px-3 py-1 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-colors"
                                    >
                                      Удалить
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Internal Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 fade-in duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border text-xs font-medium flex items-center gap-2.5 ${
              toastMessage.type === "error"
                ? "bg-rose-900 text-white border-rose-800"
                : "bg-zinc-900 text-white border-zinc-800"
            }`}
          >
            {toastMessage.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddAdCarModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddCar={handleAddCar}
        existingCarIds={cars.map((c) => c.carId).filter(Boolean) as string[]}
        defaultRk1Days={settings.rk1Days}
        defaultRk2Days={settings.rk2Days}
      />

      <AdsSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
