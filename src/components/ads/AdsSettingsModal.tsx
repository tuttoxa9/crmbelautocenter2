"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { type AdsSettings, type TikTokDebt } from "@/lib/types";
import { MONTHS_SHORT, addDaysToDateKey, getMinskDateKey } from "@/lib/services/adsService";
import { CloseBtn, GhostBtn, Overlay, PrimaryBtn, Spinner, Stepper } from "./chrome";
import { CarThumb } from "./CarThumb";
import type { WarehouseCar } from "./WarehouseDrawer";

export function AdsSettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  airCount = 0,
  cars = [],
  onSaveDebts,
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: AdsSettings;
  onSaveSettings: (settings: Partial<AdsSettings>) => Promise<void>;
  airCount?: number;
  totalCatalogCars?: number;
  cars?: WarehouseCar[];
  onSaveDebts?: (debts: TikTokDebt[]) => Promise<void>;
}) {
  const [rk1, setRk1] = useState(settings.rk1Days || 17);
  const [rk2, setRk2] = useState(settings.rk2Days || 14);
  const [perDay, setPerDay] = useState(settings.targetCarsPerDay || 3);
  const [active, setActive] = useState(settings.isActive !== false);
  const [botToken, setBotToken] = useState(settings.botToken || "");
  const [chatId, setChatId] = useState(settings.chatId || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setRk1(settings.rk1Days || 17);
    setRk2(settings.rk2Days || 14);
    setPerDay(settings.targetCarsPerDay || 3);
    setActive(settings.isActive !== false);
    setBotToken(settings.botToken || "");
    setChatId(settings.chatId || "");
    setTestResult(null);
  }, [isOpen, settings]);

  const cycle = rk1 + rk2;
  const daysFilled = Math.max(1, Math.ceil(airCount / Math.max(1, perDay)));

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveSettings({
        rk1Days: rk1,
        rk2Days: rk2,
        targetCarsPerDay: perDay,
        isActive: active,
        botToken: botToken.trim() || undefined,
        chatId: chatId.trim() || undefined,
        tiktokDebts: settings.tiktokDebts || [],
      });
      onClose();
    } catch (err) {
      console.error("Error saving ads settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await fetch("/api/ads/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: botToken.trim() || undefined,
          chatId: chatId.trim() || undefined,
        }),
      });
      const data = await res.json();
      setTestResult(
        data.success
          ? "Тестовое уведомление отправлено"
          : `Ошибка: ${data.error || "Не удалось отправить"}`,
      );
    } catch (err: any) {
      setTestResult(`Ошибка: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Overlay open={isOpen} onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ads-rules-title"
        className="ads-enter relative flex h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-ads-bg shadow-ads-float sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-center justify-between px-6 pt-6 pb-2">
          <div>
            <h2 id="ads-rules-title" className="text-xl font-semibold tracking-tight text-ads-ink">
              Правила
            </h2>
            <p className="mt-0.5 text-sm text-ads-muted">Темп съёмки, цикл и Telegram</p>
          </div>
          <CloseBtn onClick={onClose} />
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3 [touch-action:pan-y]"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="space-y-3">
            <section className="rounded-2xl bg-ads-card px-4 py-4">
              <p className="text-sm font-medium text-ads-ink">Съёмочная смена</p>
              <p className="mt-0.5 text-xs text-ads-muted">Сколько роликов команда закрывает за день</p>
              <div className="mt-3">
                <Stepper value={perDay} onChange={setPerDay} min={1} max={12} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ads-muted">
                Сейчас в эфире {airCount} авто. При {perDay} в день график занимает примерно {daysFilled}{" "}
                {daysFilled === 1 ? "день" : daysFilled < 5 ? "дня" : "дней"}.
              </p>
            </section>

            <section className="rounded-2xl bg-ads-card px-4 py-4">
              <p className="text-sm font-medium text-ads-ink">Цикл</p>
              <p className="mt-0.5 text-xs text-ads-muted">Сколько живёт креатив в каждой кампании</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-2 text-xs text-ads-muted">РК 1</p>
                  <Stepper value={rk1} onChange={setRk1} min={5} max={40} />
                </div>
                <div>
                  <p className="mb-2 text-xs text-ads-muted">РК 2</p>
                  <Stepper value={rk2} onChange={setRk2} min={5} max={40} />
                </div>
              </div>
              <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-ads-surface">
                <div className="bg-ads-ink" style={{ width: `${(rk1 / Math.max(1, cycle)) * 100}%` }} />
                <div className="bg-ads-ink/30" style={{ width: `${(rk2 / Math.max(1, cycle)) * 100}%` }} />
              </div>
              <p className="mt-3 text-sm text-ads-muted">
                Полный круг {cycle} дней, потом снова РК 1 с новым роликом.
              </p>
            </section>

            <label className="flex items-center justify-between gap-4 rounded-2xl bg-ads-card px-4 py-4">
              <span>
                <span className="block text-sm font-medium text-ads-ink">Напоминания</span>
                <span className="mt-0.5 block text-xs text-ads-muted">Утром, если есть авто на ротацию</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive((v) => !v)}
                className={`relative h-7 w-11 rounded-full transition-colors ${active ? "bg-ads-ink" : "bg-ads-surface"}`}
              >
                <span
                  className={`absolute top-0.5 size-6 rounded-full bg-ads-card shadow-ads-pill transition-transform ${
                    active ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>

            {onSaveDebts ? (
              <DebtSection debts={settings.tiktokDebts || []} cars={cars} onSave={onSaveDebts} />
            ) : null}

            <section className="rounded-2xl bg-ads-card px-4 py-4">
              <p className="text-sm font-medium text-ads-ink">Telegram</p>
              <p className="mt-0.5 text-xs text-ads-muted">Если пусто — используется общий бот CRM</p>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs text-ads-muted">Токен бота</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="от @BotFather"
                  className="h-10 w-full rounded-xl bg-ads-bg px-3 font-mono text-xs text-ads-ink outline-none placeholder:text-ads-subtle focus:bg-ads-surface focus:ring-2 focus:ring-ads-accent/25"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs text-ads-muted">ID чата или группы</span>
                <input
                  type="text"
                  autoComplete="off"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="-100…"
                  className="h-10 w-full rounded-xl bg-ads-bg px-3 font-mono text-xs text-ads-ink outline-none placeholder:text-ads-subtle focus:bg-ads-surface focus:ring-2 focus:ring-ads-accent/25"
                />
              </label>
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-ads-bg px-3 text-xs font-medium text-ads-ink hover:bg-ads-surface disabled:opacity-40"
              >
                {isTesting ? <Spinner /> : null}
                {isTesting ? "Отправка…" : "Проверить связь"}
              </button>
              {testResult && <p className="mt-2 text-xs text-ads-muted">{testResult}</p>}
            </section>
          </div>
        </div>

        <footer className="flex shrink-0 justify-end gap-2 px-5 py-4">
          <GhostBtn onClick={onClose}>Отмена</GhostBtn>
          <PrimaryBtn onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? <Spinner /> : null}
            {isSaving ? "Сохраняю" : "Сохранить"}
          </PrimaryBtn>
        </footer>
      </div>
    </Overlay>
  );
}

function fmtKey(key: string) {
  const [, m, d] = key.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[(m || 1) - 1]}`;
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

function DebtSection({
  debts,
  cars,
  onSave,
}: {
  debts: TikTokDebt[];
  cars: WarehouseCar[];
  onSave: (next: TikTokDebt[]) => Promise<void>;
}) {
  const todayKey = getMinskDateKey();
  const minKey = addDaysToDateKey(todayKey, -60);
  const maxKey = addDaysToDateKey(todayKey, 60);
  const [open, setOpen] = useState(false);
  const [dateKey, setDateKey] = useState(todayKey);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    const q = query.toLowerCase().trim();
    return cars.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        String(c.year || "").includes(q) ||
        String(c.priceUsd).includes(q)
      );
    });
  }, [cars, query]);

  const grouped = useMemo(() => {
    const keys = [...new Set(debts.map((d) => d.dateKey))].sort().reverse();
    return keys.map((key) => ({
      key,
      items: debts.filter((d) => d.dateKey === key),
    }));
  }, [debts]);

  const persist = async (next: TikTokDebt[]) => {
    setBusy(true);
    try {
      await onSave(next);
    } finally {
      setBusy(false);
    }
  };

  const addCar = async (car: WarehouseCar) => {
    if (!dateKey) return;
    const next: TikTokDebt = {
      id: newId(),
      dateKey,
      carId: car.id,
      name: car.name,
      year: car.year,
      priceUsd: car.priceUsd,
      photoUrl: car.photoUrl,
      createdAt: Date.now(),
    };
    await persist([next, ...debts]);
    setQuery("");
    setOpen(false);
  };

  const remove = async (id: string) => {
    await persist(debts.filter((d) => d.id !== id));
  };

  return (
    <section className="rounded-2xl bg-ads-card px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ads-ink">Долг TikTok</p>
          <p className="mt-0.5 text-xs text-ads-muted">
            Напоминание о доп. видео. Любая машина, любой день — ротацию не трогает.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-8 shrink-0 items-center rounded-lg bg-ads-bg px-2.5 text-xs font-medium text-ads-ink hover:bg-ads-surface"
        >
          {open ? "Скрыть" : "Добавить"}
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-2 rounded-xl bg-ads-bg p-3">
          <label className="block">
            <span className="mb-1.5 block text-xs text-ads-muted">Дата напоминания</span>
            <input
              type="date"
              value={dateKey}
              min={minKey}
              max={maxKey}
              onChange={(e) => setDateKey(e.target.value)}
              className="h-10 w-full rounded-xl bg-ads-card px-3 text-sm text-ads-ink outline-none"
            />
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ads-subtle" />
            <input
              type="text"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск авто"
              className="h-10 w-full rounded-xl bg-ads-card pr-3 pl-9 text-sm text-ads-ink outline-none placeholder:text-ads-subtle"
            />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl bg-ads-card">
            {list.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-ads-subtle">Машин нет</p>
            ) : (
              list.slice(0, 80).map((car, i) => (
                <button
                  key={car.id}
                  type="button"
                  disabled={busy || !dateKey}
                  onClick={() => void addCar(car)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ads-surface disabled:opacity-40 ${
                    i ? "border-t border-ads-line" : ""
                  }`}
                >
                  <CarThumb name={car.name} photoUrl={car.photoUrl} className="h-8 w-11" />
                  <span className="min-w-0 flex-1 truncate text-sm text-ads-ink">{car.name}</span>
                  <span className="shrink-0 text-xs text-ads-muted">{car.year ? `${car.year}` : ""}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      {grouped.length === 0 ? (
        <p className="mt-3 text-xs text-ads-subtle">Долга нет</p>
      ) : (
        <div className="mt-3 space-y-3">
          {grouped.map((g) => (
            <div key={g.key}>
              <p className="mb-1 text-[11px] font-medium text-ads-warn">{fmtKey(g.key)}</p>
              <div className="overflow-hidden rounded-xl bg-ads-bg">
                {g.items.map((debt, i) => (
                  <div
                    key={debt.id}
                    className={`flex items-center gap-2.5 px-2.5 py-2 ${i ? "border-t border-ads-line" : ""}`}
                  >
                    <CarThumb name={debt.name} photoUrl={debt.photoUrl} className="h-8 w-11" />
                    <p className="min-w-0 flex-1 truncate text-sm text-ads-ink">{debt.name}</p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(debt.id)}
                      className="flex size-8 items-center justify-center rounded-lg text-ads-subtle hover:bg-ads-surface hover:text-ads-danger disabled:opacity-40"
                      title="Снять долг"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
