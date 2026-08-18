"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  DEFAULT_ADS_SETTINGS,
} from "@/lib/services/adsService";
import { AdCar, AdCampaignType, AdsSettings } from "@/lib/types";
import { AddAdCarModal } from "./AddAdCarModal";
import { AdsSettingsModal } from "./AdsSettingsModal";
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

  // Custom Dropdowns State
  const [isTierDropdownOpen, setIsTierDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const tierRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
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

  // Filtered & Sorted Cars
  const displayedCars = useMemo(() => {
    return cars
      .filter((car) => {
        if (activeTab === "rk1" && car.campaign !== "rk1") return false;
        if (activeTab === "rk2" && car.campaign !== "rk2") return false;
        if (activeTab === "waiting" && car.campaign !== "waiting_video") return false;
        if (activeTab === "expired") {
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
  }, [cars, activeTab, selectedTier, searchQuery, sortBy, settings]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans">
      {/* Top Header */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4 sticky top-0 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
                Реклама TikTok Ads
              </h1>
              {stats.expiredCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                  {stats.expiredCount} требуют ротации
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Контроль сроков открутки и ротация автомобилей между РК 1 и РК 2
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsModalOpen(true)}
              className="bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium rounded-lg h-9 gap-1.5 shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-500" />
              Настройки сроков
            </Button>

            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg h-9 gap-1.5 px-3.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Добавить авто
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6 flex-1">
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div
            onClick={() => setActiveTab("all")}
            className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
              activeTab === "all"
                ? "border-zinc-900 ring-1 ring-zinc-900 shadow-xs"
                : "border-zinc-200/80 hover:border-zinc-300 shadow-2xs"
            }`}
          >
            <div className="text-xs font-medium text-zinc-500">Всего в рекламе</div>
            <div className="text-2xl font-bold text-zinc-900 mt-1">{stats.total}</div>
          </div>

          <div
            onClick={() => setActiveTab("rk1")}
            className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
              activeTab === "rk1"
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
            onClick={() => setActiveTab("rk2")}
            className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
              activeTab === "rk2"
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
            onClick={() => setActiveTab("waiting")}
            className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
              activeTab === "waiting"
                ? "border-amber-600 ring-1 ring-amber-600 shadow-xs"
                : "border-zinc-200/80 hover:border-zinc-300 shadow-2xs"
            }`}
          >
            <div className="text-xs font-medium text-amber-700">Ожидают съёмки</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{stats.waitingCount}</div>
          </div>

          <div
            onClick={() => setActiveTab("expired")}
            className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
              activeTab === "expired"
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
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "all"
                  ? "bg-white text-zinc-900 shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Все ({stats.total})
            </button>
            <button
              onClick={() => setActiveTab("rk1")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "rk1"
                  ? "bg-blue-600 text-white font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              РК 1 ({stats.rk1Count})
            </button>
            <button
              onClick={() => setActiveTab("rk2")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "rk2"
                  ? "bg-purple-600 text-white font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              РК 2 ({stats.rk2Count})
            </button>
            <button
              onClick={() => setActiveTab("waiting")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "waiting"
                  ? "bg-amber-600 text-white font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Ожидают ({stats.waitingCount})
            </button>
            <button
              onClick={() => setActiveTab("expired")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "expired"
                  ? "bg-rose-600 text-white font-semibold shadow-xs"
                  : "text-rose-700 hover:text-rose-900"
              }`}
            >
              Срок вышел ({stats.expiredCount})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Custom Rounded Tier Dropdown */}
            <div className="relative" ref={tierRef}>
              <button
                type="button"
                onClick={() => setIsTierDropdownOpen(!isTierDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium h-8 transition-colors shadow-2xs"
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

            {/* Custom Rounded Sort Dropdown */}
            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium h-8 transition-colors shadow-2xs"
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
                placeholder="Поиск по марке..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 h-8 text-xs rounded-lg focus:bg-white"
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
        ) : displayedCars.length === 0 ? (
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
            {cars.length === 0 && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg h-8 px-3"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
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

                      {/* Day Counter & Progress */}
                      {car.campaign !== "waiting_video" ? (
                        <div className="mt-3 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-zinc-400" />
                              В рекламе:
                            </span>
                            <span
                              className={`font-semibold font-mono ${
                                isExpired
                                  ? "text-rose-700"
                                  : progressPercent > 70
                                  ? "text-amber-700"
                                  : "text-zinc-800"
                              }`}
                            >
                              {daysInAd}-й день из {limitDays}
                            </span>
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

                    {/* Actions */}
                    <div className="pt-3 border-t border-zinc-100 flex flex-col gap-2">
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

                      {/* Utilities */}
                      <div className="flex items-center justify-between pt-1">
                        {car.campaign !== "waiting_video" ? (
                          <button
                            type="button"
                            onClick={() => handleResetTimer(car)}
                            className="text-[11px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 transition-colors"
                            title="Сбросить таймер на 0 дней"
                          >
                            <RotateCw className="w-3 h-3 text-zinc-400" />
                            Сбросить таймер
                          </button>
                        ) : (
                          <div />
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteCar(car)}
                          className="text-[11px] text-zinc-400 hover:text-rose-600 flex items-center gap-1 transition-colors ml-auto"
                          title="Удалить из рекламы"
                        >
                          <Trash2 className="w-3 h-3" />
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
