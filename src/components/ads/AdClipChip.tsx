"use client";

import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import type { AdCar, AdClipPreview } from "@/lib/types";

function hasClips(car: AdCar) {
  return Boolean(car.adClips?.length || car.videoUrl);
}

function clipsOf(car: AdCar): AdClipPreview[] {
  if (car.adClips?.length) return car.adClips;
  if (car.videoUrl) return [{ id: "legacy", downloadName: `${car.name}.mp4` }];
  return [];
}

function clipLabel(clip: AdClipPreview) {
  const bits: string[] = [];
  if (clip.durationSec) bits.push(`${clip.durationSec} с`);
  if (clip.createdAt) {
    const date = new Date(clip.createdAt);
    if (!Number.isNaN(date.getTime())) bits.push(date.toLocaleDateString("ru-RU"));
  }
  if (bits.length) return bits.join(" · ");
  return clip.id === "legacy" ? "Ролик" : "Скачать";
}

async function downloadClip(car: AdCar, clip: AdClipPreview) {
  const carId = String(car.carId || "").trim();
  if (!carId) throw new Error("Файла уже нет");
  const user = auth?.currentUser;
  if (!user) throw new Error("Войдите в CRM");
  const token = await user.getIdToken();
  const res = await fetch(
    `/api/ads/clips/download?carId=${encodeURIComponent(carId)}&clipId=${encodeURIComponent(clip.id)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (res.status === 401) throw new Error("Войдите в CRM");
  if (res.status === 404) throw new Error("Файла уже нет");
  if (!res.ok || !data.url) throw new Error(data.error || "Не скачалось, ещё раз");
  const link = document.createElement("a");
  link.href = data.url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function AdClipChip({ car }: { car: AdCar }) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const clips = clipsOf(car);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onDoc = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  if (!hasClips(car) || !car.carId) return null;

  const label = clips.length > 1 ? `Есть ролики · ${clips.length}` : "Есть ролик";

  async function save(clip: AdClipPreview) {
    setBusy(clip.id);
    setError("");
    try {
      await downloadClip(car, clip);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не скачалось, ещё раз");
    } finally {
      setBusy("");
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 items-center rounded-lg bg-ads-surface px-2.5 text-xs font-medium text-ads-ink ring-1 ring-ads-line-strong hover:bg-ads-card"
      >
        {label}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[200px] rounded-xl bg-ads-bg p-1.5 ring-1 ring-ads-line">
          {clips.map((clip) => (
            <button
              key={clip.id}
              type="button"
              disabled={!!busy}
              onClick={() => void save(clip)}
              className="flex h-9 w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left text-sm text-ads-ink hover:bg-ads-card disabled:opacity-40"
            >
              <span className="truncate">{clipLabel(clip)}</span>
              <span className="shrink-0 text-xs text-ads-muted">{busy === clip.id ? "…" : "Скачать"}</span>
            </button>
          ))}
          {error ? <p className="px-2.5 pt-1 text-[11px] text-ads-danger">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
