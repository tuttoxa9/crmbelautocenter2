"use client";

import React, { useState } from "react";
import { AdCar, AdCampaignType, AdsSettings } from "@/lib/types";
import { getPriceTierLabel } from "@/lib/services/adsService";
import {
  getAdBurn,
  TONE_BAR,
  TONE_TEXT,
  TONE_TRACK,
} from "@/lib/services/adsProgress";
import {
  ArrowLeft,
  ArrowRight,
  Car,
  CheckCircle2,
  Loader2,
  Pencil,
  Play,
  RotateCw,
  Trash2,
  Video,
} from "lucide-react";

const DAY_PRESETS = [7, 10, 14, 17, 21, 30];

interface AdsCarCardProps {
  car: AdCar;
  settings: AdsSettings;
  busy?: boolean;
  onSwitch: (car: AdCar, campaign: AdCampaignType) => void;
  onSaveDays: (car: AdCar, days: number) => void;
  onReset: (car: AdCar) => void;
  onDelete: (car: AdCar) => void;
}

export function AdsCarCard({
  car,
  settings,
  busy,
  onSwitch,
  onSaveDays,
  onReset,
  onDelete,
}: AdsCarCardProps) {
  const burn = getAdBurn(car, settings);
  const [menu, setMenu] = useState<"none" | "days" | "reset" | "delete">("none");
  const [daysValue, setDaysValue] = useState<number>(burn.limitDays || 14);

  const isActive = car.campaign === "rk1" || car.campaign === "rk2";

  return (
    <article
      className={`relative rounded-2xl border bg-white p-3 flex flex-col gap-2.5 transition-colors ${
        burn.tone === "overdue"
          ? "border-rose-300 shadow-[0_0_0_1px_rgba(225,29,72,0.12)]"
          : burn.tone === "critical"
            ? "border-rose-200"
            : "border-zinc-200/90 hover:border-zinc-300"
      }`}
    >
      {busy && (
        <div className="absolute inset-0 z-10 rounded-2xl bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {car.photoUrl ? (
          <img
            src={car.photoUrl}
            alt=""
            className="w-[72px] h-[52px] object-cover rounded-xl bg-zinc-100 shrink-0"
          />
        ) : (
          <div className="w-[72px] h-[52px] rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-400">
            <Car className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-zinc-900 leading-snug truncate">
              {car.name}
            </h3>
            <span className="text-xs font-semibold tabular-nums text-zinc-800 shrink-0">
              ${Number(car.priceUsd || 0).toLocaleString("ru-RU")}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
            {car.year ? <span>{car.year}</span> : null}
            {car.year ? <span className="w-0.5 h-0.5 rounded-full bg-zinc-300" /> : null}
            <span>{getPriceTierLabel(car.priceTier)}</span>
          </div>
        </div>
      </div>

      {burn.kind === "rotation" ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[11px] font-semibold ${TONE_TEXT[burn.tone]}`}>
              {burn.label}
            </span>
            <span className="text-[11px] tabular-nums text-zinc-500">{burn.sublabel}</span>
          </div>
          <div
            className={`h-2 w-full overflow-hidden rounded-full ${TONE_TRACK[burn.tone]}`}
            role="progressbar"
            aria-valuenow={Math.round(burn.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={burn.label}
          >
            <div
              className={`h-full rounded-full ${TONE_BAR[burn.tone]} ${
                burn.tone === "overdue" ? "ads-burn-pulse" : ""
              }`}
              style={{
                width: `${burn.percent}%`,
                transition: "width 400ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          </div>
          {burn.rotationDateLabel ? (
            <p className="text-[11px] text-zinc-400">
              Ротация {burn.rotationDateLabel}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-zinc-50 px-2.5 py-2">
          <Video className="w-3.5 h-3.5 text-zinc-500" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-zinc-800">{burn.label}</p>
            <p className="text-[11px] text-zinc-500">{burn.sublabel}</p>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-1.5 pt-0.5">
        <div className="flex min-w-0 flex-wrap gap-1.5">
        {car.campaign === "waiting_video" && (
          <ActionBtn onClick={() => onSwitch(car, "ready_for_ads")}>
            <CheckCircle2 className="w-3 h-3" />
            Отснято
          </ActionBtn>
        )}
        {car.campaign === "ready_for_ads" && (
          <>
            <ActionBtn onClick={() => onSwitch(car, "rk1")}>
              <Play className="w-3 h-3" />
              В РК 1
            </ActionBtn>
            <ActionBtn onClick={() => onSwitch(car, "rk2")}>
              <Play className="w-3 h-3" />
              В РК 2
            </ActionBtn>
          </>
        )}
        {car.campaign === "rk1" && (
          <ActionBtn onClick={() => onSwitch(car, "rk2")}>
            <ArrowRight className="w-3 h-3" />
            В РК 2
          </ActionBtn>
        )}
        {car.campaign === "rk2" && (
          <ActionBtn onClick={() => onSwitch(car, "rk1")}>
            <ArrowLeft className="w-3 h-3" />
            В РК 1
          </ActionBtn>
        )}
        {car.campaign === "waiting_video" && (
          <>
            <ActionBtn onClick={() => onSwitch(car, "rk1")}>В РК 1</ActionBtn>
            <ActionBtn onClick={() => onSwitch(car, "rk2")}>В РК 2</ActionBtn>
          </>
        )}
        </div>

        <div className="flex items-center justify-end">
          {isActive && (
            <IconBtn
              title="Срок ротации"
              onClick={() => {
                setDaysValue(burn.limitDays || 14);
                setMenu(menu === "days" ? "none" : "days");
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </IconBtn>
          )}
          {isActive && (
            <IconBtn
              title="Сбросить таймер"
              onClick={() => setMenu(menu === "reset" ? "none" : "reset")}
            >
              <RotateCw className="w-3.5 h-3.5" />
            </IconBtn>
          )}
          <IconBtn
            title="Убрать из рекламы"
            danger
            onClick={() => setMenu(menu === "delete" ? "none" : "delete")}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </IconBtn>
        </div>
      </div>

      {menu !== "none" && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
          {menu === "days" && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-zinc-800">Срок в эфире, дни</p>
              <div className="flex flex-wrap gap-1">
                {DAY_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysValue(d)}
                    className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold tabular-nums ${
                      daysValue === d
                        ? "bg-zinc-900 text-white"
                        : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-1.5">
                <Ghost onClick={() => setMenu("none")}>Отмена</Ghost>
                <Solid
                  onClick={() => {
                    onSaveDays(car, daysValue);
                    setMenu("none");
                  }}
                >
                  Сохранить
                </Solid>
              </div>
            </div>
          )}
          {menu === "reset" && (
            <Confirm
              title="Сбросить таймер?"
              body="Отсчёт начнётся с сегодняшнего дня."
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

function ActionBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-zinc-900 text-white text-[11px] font-semibold whitespace-nowrap hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-8 h-8 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 ${
        danger ? "hover:text-rose-600 hover:bg-rose-50" : "hover:text-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function Ghost({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 px-2.5 rounded-lg text-[11px] font-medium text-zinc-600 hover:bg-zinc-200/70"
    >
      {children}
    </button>
  );
}

function Solid({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 px-2.5 rounded-lg text-[11px] font-semibold bg-zinc-900 text-white hover:bg-zinc-800"
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
      <p className="text-[11px] font-semibold text-zinc-900">{title}</p>
      <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{body}</p>
      <div className="flex justify-end gap-1.5 mt-2">
        <Ghost onClick={onCancel}>Отмена</Ghost>
        <button
          type="button"
          onClick={onConfirm}
          className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold text-white ${
            danger ? "bg-rose-600 hover:bg-rose-700" : "bg-zinc-900 hover:bg-zinc-800"
          }`}
        >
          {confirm}
        </button>
      </div>
    </div>
  );
}
