"use client";

import { laneLabel, type CrmPerson } from "@/lib/quality/types";
import { PrimaryBtn } from "@/components/ads/chrome";
import { cn } from "@/lib/utils";

export function PeoplePane({
  people,
  onCreate,
  onEdit,
}: {
  people: CrmPerson[];
  onCreate: () => void;
  onEdit: (p: CrmPerson) => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-3 pb-8">
      <PrimaryBtn className="w-full" onClick={onCreate}>
        Новый человек
      </PrimaryBtn>
      {people.length === 0 ? (
        <p className="py-10 text-center text-sm text-ads-subtle">Никого нет. Создайте аккаунт — человек получит почту, пароль и кабинет «Мои цели».</p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-ads-card">
          {people.map((p, i) => (
            <button
              key={p.uid}
              type="button"
              onClick={() => onEdit(p)}
              className={cn("flex w-full items-center justify-between gap-3 px-4 py-3 text-left", i > 0 && "border-t border-ads-line")}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {p.name}
                  {!p.active ? <span className="ml-2 text-[11px] font-normal text-ads-danger">выкл</span> : null}
                </p>
                <p className="truncate text-xs text-ads-muted">
                  {p.email} · {laneLabel(p.lane)}
                  {p.marker ? ` · //${p.marker}` : " · без кода"}
                </p>
              </div>
              <span className="text-[11px] text-ads-subtle">править</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
