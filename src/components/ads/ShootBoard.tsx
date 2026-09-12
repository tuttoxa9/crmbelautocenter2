"use client";

import { type AdCampaignType, type AdCar } from "@/lib/types";
import { calculatePriceTier, getPriceTierShort } from "@/lib/services/adsService";
import { carFacts } from "@/lib/ads/copy";
import { AdsScroller, CatalogLink, Spinner } from "./chrome";
import { CarThumb } from "./CarThumb";
import { CampaignBadge } from "./CampaignBadge";
import { AdClipChip } from "./AdClipChip";
import { cn } from "@/lib/utils";

export function ShootBoard({
  cars,
  busyIds,
  onMarkShot,
  onAir,
  onWaiting,
  onDelete,
}: {
  cars: AdCar[];
  busyIds: Set<string>;
  onMarkShot: (car: AdCar) => void;
  onAir: (car: AdCar, campaign: AdCampaignType) => void;
  onWaiting: (car: AdCar) => void;
  onDelete: (car: AdCar) => void;
}) {
  const waiting = cars.filter((c) => c.campaign === "waiting_video");
  const ready = cars.filter((c) => c.campaign === "ready_for_ads");

  return (
    <div className="ads-pane flex min-h-0 flex-col max-lg:overflow-visible lg:h-full lg:overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <p className="text-xs font-medium text-ads-subtle">Съёмка</p>
        <h2 className="mt-0.5 text-xl leading-tight font-semibold tracking-tight text-ads-ink">Ролики</h2>
        <p className="mt-1 text-sm text-ads-muted">Сначала снимаем, потом ставим в кампанию.</p>
      </div>
      <AdsScroller nested className="min-h-0 flex-1">
        <Section title="На съёмку" count={waiting.length} empty="Некого снимать. Возьмите авто с сайта.">
          {waiting.map((car) => (
            <Row
              key={car.id}
              car={car}
              busy={!!car.id && busyIds.has(car.id)}
              hint="Ролика ещё нет"
              primary={{ label: "Отснято", onSelect: () => onMarkShot(car) }}
              secondary={[
                { label: "Сразу в К1", onSelect: () => onAir(car, "rk1") },
                { label: "Сразу в К2", onSelect: () => onAir(car, "rk2") },
                { label: "Убрать", danger: true, onSelect: () => onDelete(car) },
              ]}
            />
          ))}
        </Section>
        <Section title="Отснято" count={ready.length} empty="Нет готовых роликов.">
          {ready.map((car) => (
            <Row
              key={car.id}
              car={car}
              busy={!!car.id && busyIds.has(car.id)}
              hint={car.shotByName ? `Снял ${car.shotByName}` : "Можно ставить в рекламу"}
              primary={{ label: "В К1", onSelect: () => onAir(car, "rk1") }}
              extra={{ label: "В К2", onSelect: () => onAir(car, "rk2") }}
              secondary={[
                { label: "Снять заново", onSelect: () => onWaiting(car) },
                { label: "Убрать", danger: true, onSelect: () => onDelete(car) },
              ]}
            />
          ))}
        </Section>
      </AdsScroller>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  const has = count > 0;
  return (
    <section className="pb-4">
      <h3 className="px-5 pb-1 text-xs font-medium text-ads-subtle">
        {title} · {count}
      </h3>
      {has ? <div className="divide-y divide-ads-line/80">{children}</div> : <p className="px-5 py-6 text-sm text-ads-subtle">{empty}</p>}
    </section>
  );
}

function Row({
  car,
  busy,
  hint,
  primary,
  extra,
  secondary,
}: {
  car: AdCar;
  busy: boolean;
  hint: string;
  primary: { label: string; onSelect: () => void };
  extra?: { label: string; onSelect: () => void };
  secondary: { label: string; danger?: boolean; onSelect: () => void }[];
}) {
  const facts = carFacts(car);
  const tier = car.priceTier || calculatePriceTier(car.priceUsd);
  return (
    <article className="ads-card-in px-4 py-3">
      <div className="flex items-start gap-3">
        <CatalogLink carId={car.carId} className="flex min-w-0 flex-1 items-start gap-3">
          <CarThumb name={car.name} photoUrl={car.photoUrl} className="h-12 w-[4.25rem]" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium text-ads-ink">{car.name}</p>
              <CampaignBadge campaign={car.campaign} sold={car.sold} />
            </div>
            <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-ads-muted">
              <span className="inline-flex h-[18px] shrink-0 items-center rounded-md bg-ads-surface px-1.5 text-[11px] font-medium text-ads-ink">
                {getPriceTierShort(tier)}
              </span>
              {facts ? <span className="truncate font-mono tabular-nums">{facts}</span> : null}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-ads-subtle">{hint}</p>
          </div>
        </CatalogLink>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={primary.onSelect}
            className="inline-flex h-9 items-center rounded-lg bg-ads-ink px-2.5 text-xs font-medium text-ads-paper disabled:opacity-40"
          >
            {busy ? <Spinner /> : primary.label}
          </button>
          {extra ? (
            <button
              type="button"
              disabled={busy}
              onClick={extra.onSelect}
              className="inline-flex h-9 items-center rounded-lg px-2.5 text-xs font-medium text-ads-ink ring-1 ring-ads-line-strong disabled:opacity-40"
            >
              {extra.label}
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1 pl-[68px]">
        <AdClipChip car={car} />
        {secondary.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={busy}
            onClick={item.onSelect}
            className={cn(
              "h-7 rounded-md px-2 text-[11px] font-medium",
              item.danger ? "text-ads-danger hover:bg-ads-danger-soft" : "text-ads-muted hover:bg-ads-bg hover:text-ads-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </article>
  );
}
