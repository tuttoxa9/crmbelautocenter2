"use client";

import { useRef, useState } from "react";
import { qualityApi } from "@/lib/quality/client";
import { fmtDay, WEEKDAY_SHORT } from "@/lib/quality/dates";
import { laneLabel } from "@/lib/quality/types";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { GhostBtn, PrimaryBtn, Spinner } from "@/components/ads/chrome";
import { CarLine, Meter, StatusDot, dayOk } from "./ui";
import type { Board } from "./boardTypes";

const R2 = "https://belautocenter.72bb8ab6e404181c3422963f832c005e.r2.cloudflarestorage.com";

export function SmmPane({
  board,
  busy,
  onOrganic,
  onReload,
  ping,
}: {
  board: Board;
  busy: boolean;
  onOrganic: (kind: "stories" | "reels" | "posts", delta: 1 | -1) => void;
  onReload: () => Promise<void>;
  ping: (t: string) => void;
}) {
  const row = board.team[0];
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [pendingCar, setPendingCar] = useState<string | null>(null);

  if (!row) {
    return <p className="py-16 text-center text-sm text-ads-subtle">Профиль ещё не создан. Пусть админ добавит вас в Команде.</p>;
  }

  const shot = async (carId: string, videoUrl?: string) => {
    await qualityApi.shoot({ action: "shot", carId, videoUrl });
    await onReload();
    ping("Снято");
  };

  const pickVideo = (carId: string) => {
    setPendingCar(carId);
    fileRef.current?.click();
  };

  const onFile = async (file?: File) => {
    const carId = pendingCar;
    setPendingCar(null);
    if (!file || !carId) return;
    try {
      setUploading(carId);
      const user = auth?.currentUser;
      const token = user ? await user.getIdToken() : "";
      const presigned = await fetch("/api/s3/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, prefix: "videos/quality/" }),
      });
      if (!presigned.ok) throw new Error("Не дали ссылку на загрузку");
      const { url, key } = await presigned.json();
      const put = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("Файл не ушёл");
      await shot(carId, `${R2}/${key}`);
    } catch (e: any) {
      ping(e?.message || "Загрузка не вышла");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />

      <div className="grid grid-cols-7 gap-1">
        {row.days.map((d, i) => {
          const st = dayOk(d.plan, d.fact);
          const today = d.dateKey === board.todayKey;
          return (
            <div
              key={d.dateKey}
              className={cn("rounded-xl px-1 py-2 text-center", today ? "bg-ads-card shadow-ads-pill" : "bg-ads-card/60")}
            >
              <p className="text-[10px] uppercase text-ads-subtle">{WEEKDAY_SHORT[i]}</p>
              <p className="font-mono text-[11px] tabular-nums">{fmtDay(d.dateKey)}</p>
              <div className="mt-1 flex justify-center">
                <StatusDot off={st === "off"} ok={st === "ok"} bad={st === "bad"} />
              </div>
            </div>
          );
        })}
      </div>

      {row.off ? (
        <div className="rounded-2xl bg-ads-card px-4 py-6 text-center text-sm text-ads-muted">Сегодня выходной</div>
      ) : null}

      {row.note ? (
        <div className="rounded-2xl bg-ads-card px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ads-subtle">Задание на день</p>
          <p className="mt-1 text-sm text-ads-ink">{row.note}</p>
        </div>
      ) : null}

      {row.tasks.length > 0 ? (
        <section className="overflow-hidden rounded-2xl bg-ads-card">
          <p className="px-4 pt-3 text-[11px] font-medium uppercase tracking-wide text-ads-subtle">Задачи</p>
          {row.tasks.map((t) => (
            <label key={t.id} className="flex items-center gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                checked={t.done}
                disabled={busy}
                onChange={() => void qualityApi.patchTask({ id: t.id, done: !t.done }).then(onReload)}
              />
              <span className={cn("text-sm", t.done && "text-ads-subtle line-through")}>{t.title}</span>
            </label>
          ))}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-ads-card divide-y divide-ads-line">
        <Meter label="Сторис сегодня" fact={row.stories.fact} norm={row.stories.norm} onMinus={() => onOrganic("stories", -1)} onPlus={() => onOrganic("stories", 1)} busy={busy} hint="Или Graph зачтёт сам, если в сторис/подписи есть ваш код" />
        <Meter label="Рилсы сегодня" fact={row.reelsToday.fact} norm={row.reelsToday.norm} onMinus={() => onOrganic("reels", -1)} onPlus={() => onOrganic("reels", 1)} busy={busy} hint={`За неделю ${row.reels.fact}/${row.reels.norm}`} />
        <Meter label="Посты за неделю" fact={row.posts.fact} norm={row.posts.norm} onMinus={() => onOrganic("posts", -1)} onPlus={() => onOrganic("posts", 1)} busy={busy} />
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-medium text-ads-subtle">
          Съёмка {laneLabel(row.person.lane)} · снято {row.shoot.fact}
          {row.shoot.norm ? ` / ${row.shoot.norm}` : ""}
        </h2>
        {row.waiting.length === 0 ? (
          <p className="rounded-2xl bg-ads-card px-4 py-8 text-center text-sm text-ads-subtle">
            {row.person.lane === "none" ? "Линия съёмки не назначена" : "Очередь пуста — можно закрывать органику"}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-ads-card">
            {row.waiting.map((car: any, i: number) => (
              <CarLine key={car.id} car={car} border={i > 0}>
                <div className="flex flex-col items-end gap-1">
                  <PrimaryBtn className="h-8 px-3 text-xs" disabled={busy || uploading === car.id} onClick={() => void shot(car.id)}>
                    {uploading === car.id ? <Spinner /> : "Снял"}
                  </PrimaryBtn>
                  <GhostBtn className="h-7 px-2 text-[11px]" disabled={!!uploading} onClick={() => pickVideo(car.id)}>
                    + ролик
                  </GhostBtn>
                </div>
              </CarLine>
            ))}
          </div>
        )}
      </section>

      {board.liveStories.length > 0 ? (
        <section>
          <h2 className="mb-2 px-1 text-xs font-medium text-ads-subtle">Живые сторис без автора</h2>
          <div className="grid grid-cols-3 gap-2">
            {board.liveStories.map((m: any) => (
              <button
                key={m.id}
                type="button"
                onClick={() => void qualityApi.igAssign(m.id).then(onReload).then(() => ping("Зачтено"))}
                className="overflow-hidden rounded-xl bg-ads-card"
              >
                {m.thumbnail ? <img src={m.thumbnail} alt="" className="aspect-[9/16] w-full object-cover" /> : <div className="aspect-[9/16] bg-ads-surface" />}
                <p className="px-2 py-1.5 text-[11px] text-ads-muted">Моё</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
