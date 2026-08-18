"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  subscribeToAdCars,
  createAdCar,
  switchAdCarCampaign,
  resetAdCarTimer,
  deleteAdCar,
  getAdsSettings,
  updateAdsSettings,
  calculateDaysInAd,
  getPriceTierLabel,
  getCampaignLabel,
  DEFAULT_ADS_SETTINGS,
} from "@/lib/services/adsService";
import { AdCar, AdCampaignType, AdPriceTier, AdsSettings } from "@/lib/types";
import { AddAdCarModal } from "./AddAdCarModal";
import { AdsSettingsModal } from "./AdsSettingsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Car,
  SlidersHorizontal,
  Flame,
  Play,
  Layers,
} from "lucide-react";

export function AdsDashboard() {
  const [cars, setCars] = useState<AdCar[]>([]);
  const [settings, setSettings] = useState<AdsSettings>(DEFAULT_ADS_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"all" | "rk1" | "rk2" | "waiting" | "expired">("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"urgent" | "newest" | "price_asc" | "price_desc">("urgent");

  // Subscribe to ad cars
  useEffect(() => {
    setIsLoading(true);
    getAdsSettings().then(setSettings);

    const unsubscribe = subscribeToAdCars((data) => {
      setCars(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Actions
  const handleAddCar = async (carData: Omit<AdCar, "id" | "createdAt" | "updatedAt">) => {
    await createAdCar(carData);
  };

  const handleSwitchCampaign = async (car: AdCar, targetCampaign: AdCampaignType) => {
    if (!car.id) return;
    const customDays = targetCampaign === "rk1" ? settings.rk1Days : settings.rk2Days;
    await switchAdCarCampaign(car.id, targetCampaign, customDays);
  };

  const handleResetTimer = async (car: AdCar) => {
    if (!car.id) return;
    if (confirm(`Сбросить таймер открутки для "${car.name}" на 0 дней?`)) {
      await resetAdCarTimer(car.id);
    }
  };

  const handleDeleteCar = async (car: AdCar) => {
    if (!car.id) return;
    if (confirm(`Удалить "${car.name}" из рекламы?`)) {
      await deleteAdCar(car.id);
    }
  };

  const handleSaveSettings = async (newSettings: Partial<AdsSettings>) => {
    await updateAdsSettings(newSettings);
    setSettings((prev) => ({ ...prev, ...newSettings }));
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

  // Filtered & Sorted Cars
  const displayedCars = useMemo(() => {
    return cars
      .filter((car) => {
        // Tab Filter
        if (activeTab === "rk1" && car.campaign !== "rk1") return false;
        if (activeTab === "rk2" && car.campaign !== "rk2") return false;
        if (activeTab === "waiting" && car.campaign !== "waiting_video") return false;
        if (activeTab === "expired") {
          if (car.campaign === "waiting_video") return false;
          const days = calculateDaysInAd(car.startedAt);
          const limit = car.maxDays || (car.campaign === "rk1" ? settings.rk1Days : settings.rk2Days);
          if (days < limit) return false;
        }

        // Tier Filter
        if (selectedTier !== "all" && car.priceTier !== selectedTier) return false;

        // Search Filter
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
          // Sort by urgency ratio (days / limit)
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
  }, [cars, activeTab, selectedTier, searchQuery, sortBy, settings]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
                Реклама TikTok Ads
                {stats.expiredCount > 0 && (
                  <Badge variant="destructive" className="bg-rose-500/20 border-rose-500/40 text-rose-300 text-xs px-2.5 py-0.5 animate-pulse">
                    {stats.expiredCount} требуют ротации
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Система ротации креативов между РК 1 и РК 2 и автоматических напоминаний
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsModalOpen(true)}
            className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 text-xs h-9 gap-1.5"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            Настройки сроков
          </Button>

          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-9 gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Добавить авто в рекламу
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setActiveTab("all")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-zinc-900 border-zinc-700 shadow-md ring-1 ring-zinc-600"
              : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Всего в рекламе</span>
            <Layers className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-black text-zinc-100 mt-2">{stats.total}</div>
        </div>

        <div
          onClick={() => setActiveTab("rk1")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === "rk1"
              ? "bg-blue-950/40 border-blue-600 shadow-md ring-1 ring-blue-500"
              : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-xs font-semibold">РК 1</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 font-normal">
              {settings.rk1Days} дн.
            </span>
          </div>
          <div className="text-2xl font-black text-blue-400 mt-2">{stats.rk1Count}</div>
        </div>

        <div
          onClick={() => setActiveTab("rk2")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === "rk2"
              ? "bg-purple-950/40 border-purple-600 shadow-md ring-1 ring-purple-500"
              : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-xs font-semibold">РК 2</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 font-normal">
              {settings.rk2Days} дн.
            </span>
          </div>
          <div className="text-2xl font-black text-purple-400 mt-2">{stats.rk2Count}</div>
        </div>

        <div
          onClick={() => setActiveTab("waiting")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === "waiting"
              ? "bg-amber-950/40 border-amber-600 shadow-md ring-1 ring-amber-500"
              : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold">Ожидают съёмки</span>
            <Video className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">{stats.waitingCount}</div>
        </div>

        <div
          onClick={() => setActiveTab("expired")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === "expired"
              ? "bg-rose-950/50 border-rose-500 shadow-md ring-1 ring-rose-500"
              : stats.expiredCount > 0
              ? "bg-rose-950/20 border-rose-800/60 hover:border-rose-600"
              : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-semibold">Требуют ротации</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2 flex items-center gap-2">
            {stats.expiredCount}
            {stats.expiredCount > 0 && (
              <span className="text-xs font-normal text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded">
                Срочно
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === "all" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Все ({stats.total})
            </button>
            <button
              onClick={() => setActiveTab("rk1")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === "rk1" ? "bg-blue-600 text-white font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              РК 1 ({stats.rk1Count})
            </button>
            <button
              onClick={() => setActiveTab("rk2")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === "rk2" ? "bg-purple-600 text-white font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              РК 2 ({stats.rk2Count})
            </button>
            <button
              onClick={() => setActiveTab("waiting")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === "waiting" ? "bg-amber-600 text-white font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Ожидают ({stats.waitingCount})
            </button>
            <button
              onClick={() => setActiveTab("expired")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === "expired" ? "bg-rose-600 text-white font-semibold" : "text-zinc-400 hover:text-rose-300"
              }`}
            >
              Срок вышел ({stats.expiredCount})
            </button>
          </div>

          {/* Tier Filter */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-700"
          >
            <option value="all">Все ценовые группы</option>
            <option value="tier_under_7k">До $7 000</option>
            <option value="tier_7k_13k">$7 000 – $13 000</option>
            <option value="tier_13k_20k">$13 000 – $20 000</option>
            <option value="tier_20k_plus">$20 000+</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              type="text"
              placeholder="Поиск авто..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 h-8 text-xs"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 h-8 focus:outline-none"
          >
            <option value="urgent">Сначала горящие</option>
            <option value="newest">Сначала новые</option>
            <option value="price_asc">Цена: по возрастанию</option>
            <option value="price_desc">Цена: по убыванию</option>
          </select>
        </div>
      </div>

      {/* Main Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-3">
          <Spinner className="w-8 h-8 text-emerald-500" />
          <p className="text-sm">Загрузка автомобилей из рекламы...</p>
        </div>
      ) : displayedCars.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-900/30 space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-500">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-200">Автомобили не найдены</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
              {cars.length === 0
                ? "В рекламе пока нет автомобилей. Добавьте первый автомобиль со склада сайта."
                : "По выбранным фильтрам ничего не найдено."}
            </p>
          </div>
          {cars.length === 0 && (
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Добавить первый авто
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedCars.map((car) => {
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
                className={`rounded-xl border flex flex-col overflow-hidden transition-all bg-zinc-950 ${
                  isExpired
                    ? "border-rose-500/70 shadow-lg shadow-rose-950/20 ring-1 ring-rose-500/40"
                    : car.campaign === "rk1"
                    ? "border-zinc-800 hover:border-blue-500/40"
                    : car.campaign === "rk2"
                    ? "border-zinc-800 hover:border-purple-500/40"
                    : "border-zinc-800 hover:border-amber-500/40"
                }`}
              >
                {/* Card Top: Image & Status */}
                <div className="relative h-36 bg-zinc-900 flex items-center justify-center overflow-hidden border-b border-zinc-800/80">
                  {car.photoUrl ? (
                    <img
                      src={car.photoUrl}
                      alt={car.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-600 gap-1">
                      <Car className="w-8 h-8" />
                      <span className="text-[10px]">Нет фото</span>
                    </div>
                  )}

                  {/* Campaign Badge */}
                  <div className="absolute top-2.5 left-2.5">
                    {car.campaign === "rk1" && (
                      <Badge className="bg-blue-600 text-white font-bold text-[11px] px-2 py-0.5 shadow-md">
                        РК 1
                      </Badge>
                    )}
                    {car.campaign === "rk2" && (
                      <Badge className="bg-purple-600 text-white font-bold text-[11px] px-2 py-0.5 shadow-md">
                        РК 2
                      </Badge>
                    )}
                    {car.campaign === "waiting_video" && (
                      <Badge className="bg-amber-600 text-white font-bold text-[11px] px-2 py-0.5 shadow-md">
                        Ожидает съёмки
                      </Badge>
                    )}
                  </div>

                  {/* Price Tier Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <Badge variant="outline" className="bg-zinc-950/80 backdrop-blur border-zinc-700 text-zinc-200 text-[10px] font-semibold">
                      {getPriceTierLabel(car.priceTier)}
                    </Badge>
                  </div>

                  {/* Expired Warning Overlay Tag */}
                  {isExpired && (
                    <div className="absolute bottom-0 inset-x-0 bg-rose-600/90 backdrop-blur text-white text-xs font-bold py-1 px-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                        <span>Пора перенести в {car.campaign === "rk1" ? "РК 2" : "РК 1"}</span>
                      </div>
                      <span className="text-[10px] bg-rose-950/70 px-1.5 py-0.2 rounded font-mono">
                        {daysInAd} дн.
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base text-zinc-100 leading-tight">
                          {car.name}
                        </h3>
                        {car.year && (
                          <span className="text-xs text-zinc-400 font-normal">
                            {car.year} г.
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-emerald-400 text-base leading-tight">
                          ${Number(car.priceUsd).toLocaleString("ru-RU")}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Day Counter */}
                    {car.campaign !== "waiting_video" ? (
                      <div className="mt-3.5 space-y-1.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            В рекламе:
                          </span>
                          <span
                            className={`font-bold font-mono ${
                              isExpired
                                ? "text-rose-400"
                                : progressPercent > 70
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {daysInAd}-й день из {limitDays}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all rounded-full ${
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
                      <div className="mt-3.5 p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/30 flex items-center justify-between text-xs">
                        <span className="text-amber-400 font-medium flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5" />
                          Ожидает съемки видео
                        </span>
                        <span className="text-[10px] text-zinc-400">Таймер на паузе</span>
                      </div>
                    )}

                    {car.notes && (
                      <div className="mt-2 text-[11px] text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-800 truncate">
                        📝 {car.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2">
                    {car.campaign === "rk1" && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => handleSwitchCampaign(car, "rk2")}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-8 font-semibold flex items-center justify-center gap-1"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          Перенести в РК 2
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSwitchCampaign(car, "waiting_video")}
                          className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs h-8"
                        >
                          <Video className="w-3.5 h-3.5 mr-1 text-amber-400" />
                          На съёмку
                        </Button>
                      </div>
                    )}

                    {car.campaign === "rk2" && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => handleSwitchCampaign(car, "rk1")}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 font-semibold flex items-center justify-center gap-1"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          Перенести в РК 1
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSwitchCampaign(car, "waiting_video")}
                          className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs h-8"
                        >
                          <Video className="w-3.5 h-3.5 mr-1 text-amber-400" />
                          На съёмку
                        </Button>
                      </div>
                    )}

                    {car.campaign === "waiting_video" && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => handleSwitchCampaign(car, "rk1")}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 font-semibold flex items-center justify-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Запуск в РК 1
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSwitchCampaign(car, "rk2")}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-8 font-semibold flex items-center justify-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Запуск в РК 2
                        </Button>
                      </div>
                    )}

                    {/* Secondary Utilities: Reset Timer & Delete */}
                    <div className="flex items-center justify-between pt-1">
                      {car.campaign !== "waiting_video" && (
                        <button
                          type="button"
                          onClick={() => handleResetTimer(car)}
                          className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
                          title="Сбросить таймер открутки на 0 дней"
                        >
                          <RotateCw className="w-3 h-3" />
                          Сбросить таймер
                        </button>
                      )}
                      {car.campaign === "waiting_video" && <div />}

                      <button
                        type="button"
                        onClick={() => handleDeleteCar(car)}
                        className="text-[11px] text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition-colors ml-auto"
                        title="Удалить из рекламы"
                      >
                        <Trash2 className="w-3 h-3" />
                        Удалить из рекламы
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
