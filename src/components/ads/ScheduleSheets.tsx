"use client";

import { useEffect, useState } from "react";
import { addDaysToDateKey, getMinskDateKey, MONTHS_SHORT } from "@/lib/services/adsService";
import { CloseBtn, GhostBtn, Overlay, PrimaryBtn, Spinner, Stepper } from "./chrome";

export type PreviewDay = {
  dateKey: string;
  rk1: number;
  rk2: number;
  total: number;
};

function fmtKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[(m || 1) - 1]}`;
}

export function ConfirmSheet({
  open,
  title,
  message,
  days,
  confirmLabel = "Применить",
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message?: string;
  days?: PreviewDay[];
  confirmLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const slice = (days || []).slice(0, 14);
  return (
    <Overlay open={open} onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="ads-enter relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-ads-bg shadow-ads-float sm:rounded-3xl"
      >
        <header className="flex items-center justify-between px-5 pt-5 pb-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ads-ink">{title}</h2>
            {message ? <p className="mt-1 text-sm text-ads-muted">{message}</p> : null}
          </div>
          <CloseBtn onClick={onClose} />
        </header>
        {slice.length > 0 ? (
          <div className="mx-5 mb-3 overflow-hidden rounded-2xl bg-ads-card">
            {slice.map((d, i) => (
              <div
                key={d.dateKey}
                className={`flex items-center justify-between px-3.5 py-2 text-sm ${i ? "border-t border-ads-line" : ""}`}
              >
                <span className="text-ads-ink">{fmtKey(d.dateKey)}</span>
                <span className="font-mono text-xs tabular-nums text-ads-muted">
                  {d.total} · РК1 {d.rk1} · РК2 {d.rk2}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2 px-5 pt-1 pb-5">
          <GhostBtn className="flex-1" onClick={onClose}>
            Отмена
          </GhostBtn>
          <PrimaryBtn className="flex-1" disabled={busy} onClick={onConfirm}>
            {busy ? <Spinner /> : null}
            {confirmLabel}
          </PrimaryBtn>
        </div>
      </div>
    </Overlay>
  );
}

export function PostponeSheet({
  open,
  title,
  hint,
  mode,
  minDateKey,
  busy,
  onClose,
  onPickDate,
  onPickDays,
}: {
  open: boolean;
  title: string;
  hint?: string;
  mode: "date" | "vacation";
  minDateKey: string;
  busy?: boolean;
  onClose: () => void;
  onPickDate?: (toDateKey: string) => void;
  onPickDays?: (days: number) => void;
}) {
  const tomorrow = addDaysToDateKey(minDateKey, 1);
  const [days, setDays] = useState(5);
  const [custom, setCustom] = useState(tomorrow);

  useEffect(() => {
    if (open) {
      setDays(5);
      setCustom(tomorrow);
    }
  }, [open, tomorrow]);

  const maxKey = addDaysToDateKey(minDateKey, 45);
  const vacEnd = addDaysToDateKey(minDateKey, days);

  return (
    <Overlay open={open} onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="ads-enter relative w-full max-w-lg overflow-hidden rounded-t-3xl bg-ads-bg shadow-ads-float sm:rounded-3xl"
      >
        <header className="flex items-center justify-between px-5 pt-5 pb-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ads-ink">{title}</h2>
            {hint ? <p className="mt-1 text-sm text-ads-muted">{hint}</p> : null}
          </div>
          <CloseBtn onClick={onClose} />
        </header>

        {mode === "vacation" ? (
          <div className="space-y-4 px-5 pb-5">
            <div className="flex items-center justify-between rounded-2xl bg-ads-card px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ads-ink">На сколько дней</p>
                <p className="text-xs text-ads-muted">
                  Пусто {fmtKey(minDateKey)} — {fmtKey(addDaysToDateKey(vacEnd, -1))}
                </p>
              </div>
              <Stepper value={days} onChange={setDays} min={1} max={21} />
            </div>
            <PrimaryBtn className="w-full" disabled={busy} onClick={() => onPickDays?.(days)}>
              {busy ? <Spinner /> : null}
              Сдвинуть график
            </PrimaryBtn>
          </div>
        ) : (
          <div className="space-y-3 px-5 pb-5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onPickDate?.(tomorrow)}
                className="h-11 rounded-xl bg-ads-ink text-sm font-medium text-ads-paper disabled:opacity-40"
              >
                Завтра
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onPickDate?.(addDaysToDateKey(minDateKey, 2))}
                className="h-11 rounded-xl bg-ads-card text-sm font-medium text-ads-ink disabled:opacity-40"
              >
                Послезавтра
              </button>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ads-muted">Другая дата</span>
              <input
                type="date"
                value={custom}
                min={tomorrow}
                max={maxKey}
                onChange={(e) => setCustom(e.target.value)}
                className="h-11 w-full rounded-xl bg-ads-card px-3 text-sm text-ads-ink outline-none"
              />
            </label>
            <PrimaryBtn className="w-full" disabled={busy || !custom} onClick={() => custom && onPickDate?.(custom)}>
              {busy ? <Spinner /> : null}
              Отложить
            </PrimaryBtn>
          </div>
        )}
      </div>
    </Overlay>
  );
}

export function nextAirDateLabel(cars: { campaign?: string; targetRotationDate?: number }[]) {
  const today = getMinskDateKey(Date.now());
  const keys = cars
    .filter((c) => c.campaign === "rk1" || c.campaign === "rk2")
    .map((c) => (c.targetRotationDate ? getMinskDateKey(c.targetRotationDate) : null))
    .filter((k): k is string => !!k && k >= today)
    .sort();
  if (!keys.length) return null;
  return fmtKey(keys[0]);
}
