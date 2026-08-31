"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { type AdCampaignType, type AdCar, type AdsSettings } from "@/lib/types";
import { getPriceTierLabel } from "@/lib/services/adsService";
import { getAdBurn } from "@/lib/services/adsProgress";
import { cn } from "@/lib/utils";
import { CarThumb } from "./CarThumb";
import { BusyOverlay, BurnMeter, CatalogLink, GhostBtn, PrimaryBtn } from "./chrome";

const DAY_PRESETS = [7, 10, 14, 17, 21, 30];

export function AdsCarCard({
  car,
  settings,
  busy,
  onSwitch,
  onSaveDays,
  onReset,
  onDelete,
}: {
  car: AdCar;
  settings: AdsSettings;
  busy?: boolean;
  onSwitch: (car: AdCar, campaign: AdCampaignType) => void;
  onSaveDays: (car: AdCar, days: number) => void;
  onReset: (car: AdCar) => void;
  onDelete: (car: AdCar) => void;
}) {
  const burn = getAdBurn(car, settings);
  const [menu, setMenu] = useState<"none" | "actions" | "days" | "reset" | "delete">("none");
  const [daysValue, setDaysValue] = useState(burn.limitDays || 14);
  const isActive = car.campaign === "rk1" || car.campaign === "rk2";

  return (
    <article className="relative min-w-0 px-4 py-3">
      <BusyOverlay show={busy} />
      <div className="flex items-start gap-3">
        <CatalogLink carId={car.carId} className="flex min-w-0 flex-1 items-start gap-3">
          <CarThumb name={car.name} photoUrl={car.photoUrl} className="h-10 w-14" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-sm font-medium tracking-tight text-ads-ink">{car.name}</h3>
              <span className="shrink-0 font-mono text-xs font-medium tabular-nums text-ads-muted">
                ${Number(car.priceUsd).toLocaleString("ru-RU")}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ads-subtle">
              {car.year ? `${car.year} · ` : ""}
              {getPriceTierLabel(car.priceTier)}
            </p>
          </div>
        </CatalogLink>
      </div>

      {burn.kind === "rotation" ? (
        <div className="mt-2">
          <BurnMeter label={burn.label} sublabel={burn.sublabel} percent={burn.percent} tone={burn.tone} />
        </div>
      ) : (
        <p className="mt-2 text-xs font-medium text-ads-muted">{burn.label}</p>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        {isActive && (
          <>
            <button
              type="button"
              onClick={() => onSwitch(car, "rk1")}
              className="inline-flex h-8 items-center rounded-lg bg-ads-ink px-2.5 text-xs font-medium text-ads-paper hover:bg-ads-rail active:scale-[0.97]"
            >
              В РК 1
            </button>
            <button
              type="button"
              onClick={() => onSwitch(car, "rk2")}
              className="inline-flex h-8 items-center rounded-lg bg-ads-ink px-2.5 text-xs font-medium text-ads-paper hover:bg-ads-rail active:scale-[0.97]"
            >
              В РК 2
            </button>
          </>
        )}
        {car.campaign === "waiting_video" && (
          <Mini onClick={() => onSwitch(car, "ready_for_ads")}>Отснято</Mini>
        )}
        {car.campaign === "ready_for_ads" && (
          <>
            <Mini onClick={() => onSwitch(car, "rk1")}>В РК 1</Mini>
            <Mini onClick={() => onSwitch(car, "rk2")}>В РК 2</Mini>
          </>
        )}
        <span className="ml-auto">
          <button
            type="button"
            title="Ещё"
            onClick={() => setMenu(menu === "none" ? "actions" : "none")}
            className="relative inline-flex size-8 items-center justify-center rounded-lg text-ads-subtle hover:bg-ads-bg hover:text-ads-ink"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </span>
      </div>

      {menu !== "none" && (
        <div className="mt-2 rounded-xl bg-ads-bg p-2.5">
          {menu === "actions" && (
            <div className="flex flex-col">
              {isActive && (
                <MenuItem
                  onClick={() => {
                    setDaysValue(burn.limitDays || 14);
                    setMenu("days");
                  }}
                >
                  Срок
                </MenuItem>
              )}
              {isActive && <MenuItem onClick={() => setMenu("reset")}>Сбросить таймер</MenuItem>}
              <MenuItem danger onClick={() => setMenu("delete")}>
                Убрать из рекламы
              </MenuItem>
            </div>
          )}
          {menu === "days" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-ads-ink">Срок в эфире</p>
              <div className="flex flex-wrap gap-1">
                {DAY_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysValue(d)}
                    className={cn(
                      "h-8 min-w-8 rounded-lg px-2 font-mono text-xs font-medium tabular-nums",
                      daysValue === d ? "bg-ads-ink text-ads-paper" : "bg-ads-card text-ads-ink hover:bg-ads-surface",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-1">
                <GhostBtn className="h-8 px-2.5 text-xs" onClick={() => setMenu("none")}>
                  Отмена
                </GhostBtn>
                <PrimaryBtn
                  className="h-8 px-2.5 text-xs"
                  onClick={() => {
                    onSaveDays(car, daysValue);
                    setMenu("none");
                  }}
                >
                  Сохранить
                </PrimaryBtn>
              </div>
            </div>
          )}
          {menu === "reset" && (
            <Confirm
              title="Сбросить таймер?"
              body="Отсчёт с сегодня, слот пересчитается."
              confirm="Сбросить"
              onCancel={() => setMenu("none")}
              onConfirm={() => {
                onReset(car);
                setMenu("none");
              }}
            />
          )}
          {menu === "delete" && (
            <Confirm
              title="Убрать из рекламы?"
              body={car.name}
              confirm="Убрать"
              danger
              onCancel={() => setMenu("none")}
              onConfirm={() => {
                onDelete(car);
                setMenu("none");
              }}
            />
          )}
        </div>
      )}
    </article>
  );
}

function Mini({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center rounded-lg bg-ads-ink px-2.5 text-xs font-medium whitespace-nowrap text-ads-paper hover:bg-ads-rail active:scale-[0.97]"
    >
      {children}
    </button>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-lg px-2.5 text-left text-sm text-ads-ink hover:bg-ads-card",
        danger && "text-ads-danger hover:bg-ads-danger-soft",
      )}
    >
      {children}
    </button>
  );
}

function Confirm({
  title,
  body,
  confirm,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirm: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-ads-ink">{title}</p>
      <p className="mt-0.5 truncate text-xs text-ads-muted">{body}</p>
      <div className="mt-2 flex justify-end gap-1">
        <GhostBtn className="h-8 px-2.5 text-xs" onClick={onCancel}>
          Отмена
        </GhostBtn>
        <button
          type="button"
          onClick={onConfirm}
          className={cn(
            "h-8 rounded-lg px-2.5 text-xs font-medium text-ads-paper",
            danger ? "bg-ads-danger" : "bg-ads-ink hover:bg-ads-rail",
          )}
        >
          {confirm}
        </button>
      </div>
    </div>
  );
}
