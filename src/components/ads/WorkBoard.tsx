"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { type AdCar } from "@/lib/types";
import { calculatePriceTier, getCalendarDaysLeft, getPriceTierShort } from "@/lib/services/adsService";
import { carFacts, otherAir } from "@/lib/ads/copy";
import { cn } from "@/lib/utils";
import { CarThumb } from "./CarThumb";
import { CatalogLink, Spinner, WorkBtn } from "./chrome";

export type NoClipItem = {
  key: string;
  name: string;
  year?: string | number;
  priceUsd: number;
  photoUrl?: string;
  carId: string;
  adCar?: AdCar;
};

export function WorkBoard({
  moveFromK1,
  moveFromK2,
  noClip,
  ready,
  busyIds,
  addingId,
  onRotate,
  onMarkShot,
  onAir,
  onManual,
}: {
  moveFromK1: AdCar[];
  moveFromK2: AdCar[];
  noClip: NoClipItem[];
  ready: AdCar[];
  busyIds: Set<string>;
  addingId: string | null;
  onRotate: (car: AdCar) => void;
  onMarkShot: (item: NoClipItem) => void;
  onAir: (car: AdCar, campaign: "rk1" | "rk2") => void;
  onManual?: () => void;
}) {
  const moveCount = moveFromK1.length + moveFromK2.length;

  return (
    <div className="flex flex-col gap-5">
      <section className="ads-pane overflow-hidden">
        <BlockHead
          kicker="Сейчас"
          title="Перенести"
          count={moveCount}
          hint="Срок в кампании вышел — переложите в другую"
        />
        {moveCount === 0 ? (
          <p className="px-5 pb-6 text-sm text-ads-muted">Переносить нечего.</p>
        ) : (
          <div className="grid grid-cols-1 divide-y divide-ads-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <MoveColumn title="Из К1" hint="В кампанию 2" cars={moveFromK1} busyIds={busyIds} onRotate={onRotate} />
            <MoveColumn title="Из К2" hint="В кампанию 1" cars={moveFromK2} busyIds={busyIds} onRotate={onRotate} />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <NoClipBlock
          items={noClip}
          busyIds={busyIds}
          addingId={addingId}
          onMarkShot={onMarkShot}
          onManual={onManual}
        />
        <ReadyBlock cars={ready} busyIds={busyIds} onAir={onAir} />
      </div>
    </div>
  );
}

function BlockHead({
  kicker,
  title,
  count,
  hint,
}: {
  kicker: string;
  title: string;
  count: number;
  hint: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-5 pt-5 pb-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-ads-subtle">{kicker}</p>
        <h2 className="mt-0.5 text-xl leading-tight font-semibold tracking-tight text-ads-ink">{title}</h2>
        <p className="mt-1 text-sm text-ads-muted">{hint}</p>
      </div>
      <span className="shrink-0 font-mono text-sm tabular-nums text-ads-muted">{count}</span>
    </div>
  );
}

function MoveColumn({
  title,
  hint,
  cars,
  busyIds,
  onRotate,
}: {
  title: string;
  hint: string;
  cars: AdCar[];
  busyIds: Set<string>;
  onRotate: (car: AdCar) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 px-5 py-3">
        <div>
          <h3 className="text-sm font-medium text-ads-ink">{title}</h3>
          <p className="text-xs text-ads-subtle">{hint}</p>
        </div>
        <span className="font-mono text-sm tabular-nums text-ads-muted">{cars.length}</span>
      </div>
      {cars.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-ads-subtle">Пусто</p>
      ) : (
        <div className="divide-y divide-ads-line/80 pb-2">
          {cars.map((car) => {
            const busy = !!car.id && busyIds.has(car.id);
            const left = getCalendarDaysLeft(car.targetRotationDate, car.startedAt, car.maxDays);
            return (
              <WorkRow
                key={car.id}
                name={car.name}
                photoUrl={car.photoUrl}
                carId={car.carId}
                facts={carFacts(car)}
                hint={rotateHint(left)}
                busy={busy}
              >
                <WorkBtn disabled={busy} onClick={() => onRotate(car)}>
                  {busy ? <Spinner /> : car.campaign === "rk1" ? "В К2" : "В К1"}
                </WorkBtn>
              </WorkRow>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NoClipBlock({
  items,
  busyIds,
  addingId,
  onMarkShot,
  onManual,
}: {
  items: NoClipItem[];
  busyIds: Set<string>;
  addingId: string | null;
  onMarkShot: (item: NoClipItem) => void;
  onManual?: () => void;
}) {
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        String(item.year || "").includes(q) ||
        String(item.priceUsd).includes(q)
      );
    });
  }, [items, query]);

  return (
    <section className="ads-pane overflow-hidden">
      <BlockHead
        kicker="Съёмка"
        title="Нет ролика"
        count={items.length}
        hint="Нет в рекламе или ролик ещё не снят"
      />
      {items.length > 6 ? (
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ads-subtle" />
            <input
              type="text"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти авто"
              className="h-11 w-full rounded-2xl border-0 bg-ads-bg pr-11 pl-9 text-sm text-ads-ink outline-none placeholder:text-ads-subtle focus:bg-ads-surface focus:ring-2 focus:ring-ads-accent/25"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center text-ads-subtle"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {list.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-ads-muted">
          {query ? "Ничего по запросу." : "Все машины либо в эфире, либо уже отсняты."}
        </p>
      ) : (
        <div className="divide-y divide-ads-line/80 pb-2">
          {list.map((item) => {
            const busy = addingId === item.carId || (!!item.adCar?.id && busyIds.has(item.adCar.id));
            return (
              <WorkRow
                key={item.key}
                name={item.name}
                photoUrl={item.photoUrl}
                carId={item.carId}
                facts={carFacts(item)}
                hint={item.adCar ? "На доске · ролика нет" : "Не в рекламе"}
                busy={busy}
              >
                <WorkBtn disabled={busy} onClick={() => onMarkShot(item)}>
                  {busy ? <Spinner /> : "Отснято"}
                </WorkBtn>
              </WorkRow>
            );
          })}
        </div>
      )}
      {onManual ? (
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onManual}
            className="text-sm font-medium text-ads-muted hover:text-ads-ink"
          >
            Добавить вручную
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ReadyBlock({
  cars,
  busyIds,
  onAir,
}: {
  cars: AdCar[];
  busyIds: Set<string>;
  onAir: (car: AdCar, campaign: "rk1" | "rk2") => void;
}) {
  return (
    <section className="ads-pane overflow-hidden">
      <BlockHead
        kicker="Готово"
        title="Отснято"
        count={cars.length}
        hint="Ролик есть — поставьте в К1 или К2"
      />
      {cars.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-ads-muted">Нет готовых роликов.</p>
      ) : (
        <div className="divide-y divide-ads-line/80 pb-2">
          {cars.map((car) => {
            const busy = !!car.id && busyIds.has(car.id);
            const tier = car.priceTier || calculatePriceTier(car.priceUsd);
            const facts = carFacts(car);
            return (
              <WorkRow
                key={car.id}
                name={car.name}
                photoUrl={car.photoUrl}
                carId={car.carId}
                facts={facts}
                hint={car.shotByName ? `Снял ${car.shotByName}` : getPriceTierShort(tier)}
                busy={busy}
              >
                <WorkBtn disabled={busy} onClick={() => onAir(car, "rk1")}>
                  {busy ? <Spinner /> : "В К1"}
                </WorkBtn>
                <WorkBtn tone="soft" disabled={busy} onClick={() => onAir(car, "rk2")}>
                  В К2
                </WorkBtn>
              </WorkRow>
            );
          })}
        </div>
      )}
    </section>
  );
}

function WorkRow({
  name,
  photoUrl,
  carId,
  facts,
  hint,
  busy,
  children,
}: {
  name: string;
  photoUrl?: string;
  carId?: string;
  facts: string;
  hint: string;
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className={cn("px-4 py-3.5 sm:px-5", busy && "opacity-60")}>
      <div className="flex items-center gap-3">
        <CatalogLink carId={carId} className="flex min-w-0 flex-1 items-center gap-3">
          <CarThumb name={name} photoUrl={photoUrl} className="h-14 w-20 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium tracking-tight text-ads-ink">{name}</p>
            <p className="mt-0.5 truncate font-mono text-xs tabular-nums text-ads-muted">{facts}</p>
            <p className="mt-0.5 truncate text-xs text-ads-subtle">{hint}</p>
          </div>
        </CatalogLink>
        <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">{children}</div>
      </div>
    </article>
  );
}

function rotateHint(daysLeft: number) {
  if (daysLeft === 0) return "сегодня";
  const n = Math.abs(daysLeft);
  const word = pluralDays(n);
  return daysLeft < 0 ? `просрочено ${n} ${word}` : `${n} ${word}`;
}

function pluralDays(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}
