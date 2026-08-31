"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, MoreHorizontal } from "lucide-react";
import { type AdCampaignType, type AdCar, type AdsSettings, type TikTokDebt } from "@/lib/types";
import { MONTHS_LONG, calculatePriceTier, getCalendarDaysLeft, getMinskDateKey, getPriceTierShort } from "@/lib/services/adsService";
import { cn } from "@/lib/utils";
import { WorkTask } from "./WorkTask";
import { RotationTimeline } from "./RotationTimeline";
import { CarThumb } from "./CarThumb";
import { AdsScroller, CatalogLink, GhostBtn, PrimaryBtn, Spinner } from "./chrome";

type ActionItem = {
  label: string;
  danger?: boolean;
  onSelect: () => void;
};

export function TodayShift({
  cars,
  settings,
  busyIds,
  balancing,
  nextDueLabel,
  onSwitch,
  onDelete,
  onEqualize,
  onVacation,
  onOpenWarehouse,
  onDayClick,
}: {
  cars: AdCar[];
  settings: AdsSettings;
  busyIds: Set<string>;
  balancing: boolean;
  nextDueLabel?: string | null;
  onSwitch: (car: AdCar, campaign: AdCampaignType) => void;
  onDelete: (car: AdCar) => void;
  onEqualize: () => void;
  onVacation: () => void;
  onOpenWarehouse: () => void;
  onDayClick: (offset: number, date: Date, dayCars: AdCar[], dayDebts?: TikTokDebt[]) => void;
}) {
  const overdue = cars.filter((c) => isAir(c) && daysLeft(c) < 0);
  const dueToday = cars.filter((c) => isAir(c) && daysLeft(c) === 0);
  const waiting = cars.filter((c) => c.campaign === "waiting_video");
  const ready = cars.filter((c) => c.campaign === "ready_for_ads");
  const workCount = overdue.length + dueToday.length;
  const todayKey = getMinskDateKey();
  const [, m, d] = todayKey.split("-").map(Number);
  const dateLabel = `${d} ${MONTHS_LONG[(m || 1) - 1]}`;
  const [shootTab, setShootTab] = useState<"waiting" | "ready">("waiting");
  const shootList = shootTab === "waiting" ? waiting : ready;

  return (
    <div className="ads-pane ads-shift flex min-h-0 flex-col">
      <AdsScroller nested className="min-h-0 flex-1">
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-medium text-ads-subtle">Смена</p>
        <h2 className="mt-0.5 text-xl leading-tight font-semibold tracking-tight text-ads-ink">{dateLabel}</h2>
        <p className="mt-1 text-sm text-ads-muted">
          {workCount === 0
            ? nextDueLabel
              ? `Сегодня пусто. Ближайшие задачи — ${nextDueLabel}.`
              : "Ротировать некого. Можно снимать или взять авто со склада."
            : `Закрыть день: ${workCount} ${plural(workCount, "машина", "машины", "машин")}.`}
        </p>
      </div>

      {workCount === 0 ? (
        <div className="mx-4 mb-4 rounded-2xl bg-ads-bg px-4 py-8 text-center">
          <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-ads-card shadow-ads-pill">
            <Check className="size-4 text-ads-ink" />
          </div>
          <p className="mt-3 text-sm font-medium text-ads-ink">Сегодня чисто</p>
          <p className="mt-1 text-xs text-ads-muted">
            {nextDueLabel ? `Следующая ротация ${nextDueLabel}.` : "Ближайшие ротации — на графике нагрузки."}
          </p>
          <PrimaryBtn className="mt-4" onClick={onOpenWarehouse}>
            Взять со склада
          </PrimaryBtn>
        </div>
      ) : (
        <div>
          {overdue.length > 0 && (
            <Group title={`Просрочено · ${overdue.length}`}>
              {overdue.map((car) => (
                <WorkTask
                  key={car.id}
                  car={car}
                  settings={settings}
                  busy={!!car.id && busyIds.has(car.id)}
                  onSwitch={onSwitch}
                />
              ))}
            </Group>
          )}
          {dueToday.length > 0 && (
            <Group title={`Сегодня · ${dueToday.length}`}>
              {dueToday.map((car) => (
                <WorkTask
                  key={car.id}
                  car={car}
                  settings={settings}
                  busy={!!car.id && busyIds.has(car.id)}
                  onSwitch={onSwitch}
                />
              ))}
            </Group>
          )}
        </div>
      )}

      <div className="mx-4 my-1 h-px bg-ads-line" />

      <div className="px-4 py-3">
        <h3 className="mb-2 px-1 text-xs font-medium text-ads-subtle">Съёмка</h3>
        <div className="mb-2 grid grid-cols-2 gap-0.5 rounded-xl bg-ads-surface p-0.5">
          <ShootTab
            active={shootTab === "waiting"}
            count={waiting.length}
            onClick={() => setShootTab("waiting")}
          >
            Ожидает
          </ShootTab>
          <ShootTab
            active={shootTab === "ready"}
            count={ready.length}
            onClick={() => setShootTab("ready")}
          >
            Отснято
          </ShootTab>
        </div>
        {shootList.length === 0 ? (
          <p className="px-1 py-3 text-sm text-ads-subtle">
            {shootTab === "waiting" ? "Некого снимать" : "Нет отснятых"}
          </p>
        ) : (
          <div>
            {shootList.map((car) => {
              const busy = !!car.id && busyIds.has(car.id);
              if (shootTab === "waiting") {
                return (
                  <ShootRow
                    key={car.id}
                    car={car}
                    busy={busy}
                    primary={{
                      label: "Отснято",
                      onSelect: () => onSwitch(car, "ready_for_ads"),
                    }}
                    menuLabel="Ещё"
                    items={[
                      { label: "В РК 1", onSelect: () => onSwitch(car, "rk1") },
                      { label: "В РК 2", onSelect: () => onSwitch(car, "rk2") },
                      { label: "Убрать", danger: true, onSelect: () => onDelete(car) },
                    ]}
                  />
                );
              }
              return (
                <ShootRow
                  key={car.id}
                  car={car}
                  busy={busy}
                  menuLabel="Действия"
                  items={[
                    { label: "В РК 1", onSelect: () => onSwitch(car, "rk1") },
                    { label: "В РК 2", onSelect: () => onSwitch(car, "rk2") },
                    { label: "Убрать", danger: true, onSelect: () => onDelete(car) },
                  ]}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="mx-4 my-1 h-px bg-ads-line" />

      <div className="px-4 pt-3 pb-4">
        <div className="mb-2 flex items-end justify-between gap-3 px-1">
          <div>
            <h3 className="text-sm font-medium text-ads-ink">Нагрузка</h3>
            <p className="text-xs text-ads-muted">Не больше {settings.targetCarsPerDay || 3} в день</p>
          </div>
          <div className="flex items-center gap-1">
            <GhostBtn className="h-8 px-2.5 text-xs" onClick={onVacation} disabled={balancing}>
              Каникулы
            </GhostBtn>
            <GhostBtn className="h-8 px-2.5 text-xs" onClick={onEqualize} disabled={balancing}>
              {balancing ? <Spinner /> : null}
              {balancing ? "Считаю" : "50 / 50"}
            </GhostBtn>
          </div>
        </div>
        <RotationTimeline cars={cars} settings={settings} debts={settings.tiktokDebts} days={14} onDayClick={onDayClick} />
      </div>
      </AdsScroller>
    </div>
  );
}

function ShootTab({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors",
        active ? "bg-ads-card text-ads-ink shadow-ads-pill" : "text-ads-muted hover:text-ads-ink",
      )}
    >
      {children}
      <span className="font-mono tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="px-5 pb-1 text-xs font-medium text-ads-subtle">{title}</h3>
      <div className="divide-y divide-ads-line/80">{children}</div>
    </section>
  );
}

function ShootRow({
  car,
  busy,
  primary,
  menuLabel,
  items,
}: {
  car: AdCar;
  busy: boolean;
  primary?: ActionItem;
  menuLabel: string;
  items: ActionItem[];
}) {
  const tier = car.priceTier || calculatePriceTier(car.priceUsd);
  const price = Number(car.priceUsd) || 0;
  return (
    <div className="relative flex items-center gap-2.5 rounded-xl px-1 py-1.5">
      <CatalogLink carId={car.carId} className="flex min-w-0 flex-1 items-center gap-2.5">
        <CarThumb name={car.name} photoUrl={car.photoUrl} className="h-9 w-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ads-ink">{car.name}</p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ads-muted">
            <span className="inline-flex h-[18px] shrink-0 items-center rounded-md bg-ads-surface px-1.5 text-[11px] font-medium text-ads-ink">
              {getPriceTierShort(tier)}
            </span>
            {price > 0 ? (
              <span className="truncate font-mono tabular-nums">${price.toLocaleString("ru-RU")}</span>
            ) : null}
          </p>
        </div>
      </CatalogLink>
      <div className="flex shrink-0 items-center gap-1">
        {primary ? (
          <button
            type="button"
            disabled={busy}
            onClick={primary.onSelect}
            className="inline-flex h-8 items-center rounded-lg bg-ads-ink px-2.5 text-xs font-medium text-ads-paper disabled:opacity-40"
          >
            {busy ? <Spinner /> : primary.label}
          </button>
        ) : null}
        <ActionMenu label={menuLabel} busy={busy} items={items} iconOnly={!!primary} />
      </div>
    </div>
  );
}

function ActionMenu({
  label,
  busy,
  items,
  iconOnly,
}: {
  label: string;
  busy: boolean;
  items: ActionItem[];
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const place = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const menuW = 188;
    const menuH = items.length * 40 + 8;
    const gap = 6;
    const pad = 8;
    const left = Math.min(Math.max(pad, r.right - menuW), window.innerWidth - menuW - pad);
    const below = r.bottom + gap;
    const fitsBelow = below + menuH <= window.innerHeight - pad;
    const top = fitsBelow ? below : Math.max(pad, r.top - gap - menuH);
    setCoords({ top, left });
  }, [items.length]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: Event) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 items-center justify-center text-xs font-medium disabled:opacity-40",
          iconOnly
            ? "size-8 rounded-lg text-ads-subtle hover:bg-ads-bg hover:text-ads-ink"
            : "gap-1 rounded-lg bg-ads-ink px-2.5 text-ads-paper",
        )}
      >
        {busy && !iconOnly ? (
          <Spinner />
        ) : iconOnly ? (
          <MoreHorizontal className="size-4" />
        ) : (
          <>
            {label}
            <ChevronDown className="size-3.5 opacity-70" />
          </>
        )}
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              style={{ top: coords.top, left: coords.left }}
              className="fixed z-[80] w-[188px] overflow-hidden rounded-xl bg-ads-card py-1 shadow-ads-float ring-1 ring-black/8"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={cn(
                    "flex h-10 w-full items-center px-3 text-left text-sm",
                    item.danger
                      ? "text-ads-danger hover:bg-ads-danger-soft"
                      : "text-ads-ink hover:bg-ads-surface",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function isAir(c: AdCar) {
  return c.campaign === "rk1" || c.campaign === "rk2";
}
function daysLeft(c: AdCar) {
  return getCalendarDaysLeft(c.targetRotationDate, c.startedAt, c.maxDays);
}
function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
