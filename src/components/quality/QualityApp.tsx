"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { qualityApi } from "@/lib/quality/client";
import { fmtDay } from "@/lib/quality/dates";
import type { CrmPerson } from "@/lib/quality/types";
import { AdsScroller, PrimaryBtn, Spinner } from "@/components/ads/chrome";
import { cn } from "@/lib/utils";
import type { Board } from "./boardTypes";
import { SmmPane } from "./SmmPane";
import { ShiftPane } from "./ShiftPane";
import { PlanPane } from "./PlanPane";
import { ShootPane } from "./ShootPane";
import { PeoplePane } from "./PeoplePane";
import { IgPane } from "./IgPane";
import { PersonEditor } from "./PersonEditor";

type Tab = "shift" | "plan" | "shoot" | "people" | "ig";

export function QualityApp() {
  const { user, userRole, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("shift");
  const [toast, setToast] = useState<string | null>(null);
  const [editor, setEditor] = useState<CrmPerson | null | "new">(null);

  const isSmm = userRole === "smm";
  const isAdmin = userRole === "admin";

  const load = useCallback(async () => {
    const data = await qualityApi.board();
    setBoard(data);
  }, []);

  const ping = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (userRole === "commission") {
      router.replace("/commission");
      return;
    }
    if (isSmm && pathname.startsWith("/quality")) {
      router.replace("/goals");
      return;
    }
    if (isAdmin && pathname.startsWith("/goals")) {
      router.replace("/quality");
      return;
    }
    if (user) {
      void load().catch((err: any) => setError(err?.message || "Не загрузилось"));
    }
  }, [loading, user, userRole, pathname, router, isSmm, isAdmin, load]);

  const run = async (fn: () => Promise<void>, ok?: string) => {
    try {
      setBusy(true);
      await fn();
      await load();
      if (ok) ping(ok);
    } catch (err: any) {
      ping(err?.message || "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !userRole) {
    return (
      <div className="ads-os flex h-full items-center justify-center">
        <Spinner large />
      </div>
    );
  }

  if (!board && error) {
    return (
      <div className="ads-os flex h-full flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-ads-muted">{error}</p>
        <PrimaryBtn onClick={() => void load().then(() => setError(null))}>Ещё раз</PrimaryBtn>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="ads-os flex h-full items-center justify-center">
        <Spinner large />
      </div>
    );
  }

  const peopleForEditor = board.peopleAll || board.people;
  const editing = editor && editor !== "new" ? editor : null;

  return (
    <div className="ads-os flex h-full min-h-0 flex-col text-ads-ink">
      <header className="shrink-0 border-b border-ads-line/70 bg-ads-bg/80 px-5 py-3 backdrop-blur-xl sm:px-6">
        <p className="text-xs font-medium text-ads-subtle">{isSmm ? "Кабинет" : "Контроль работ"}</p>
        <div className="mt-0.5 flex items-end justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{isSmm ? "Мои цели" : "Контроль качества"}</h1>
          <span className="font-mono text-xs tabular-nums text-ads-muted">{fmtDay(board.todayKey)}</span>
        </div>
        {isAdmin ? (
          <div className="mt-3 grid grid-cols-5 gap-0.5 rounded-xl bg-ads-surface p-0.5">
            {(
              [
                ["shift", "Смена"],
                ["plan", "План"],
                ["shoot", "Съёмка"],
                ["people", "Команда"],
                ["ig", "Instagram"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "h-8 rounded-lg text-xs font-medium",
                  tab === id ? "bg-ads-card text-ads-ink shadow-ads-pill" : "text-ads-muted",
                )}
              >
                {label}
                {id === "ig" && board.unattributed > 0 ? (
                  <span className="ml-1 font-mono text-[10px] opacity-70">{board.unattributed}</span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <AdsScroller className="min-h-0 flex-1" contentClassName="px-4 py-4 sm:px-6">
        {isSmm ? (
          <SmmPane
            board={board}
            busy={busy}
            onOrganic={(kind, delta) => run(() => qualityApi.organic({ kind, delta }))}
            onReload={load}
            ping={ping}
          />
        ) : tab === "shift" ? (
          <ShiftPane
            board={board}
            busy={busy}
            onOrganic={(uid, kind, delta) => run(() => qualityApi.organic({ uid, kind, delta }))}
            onReload={load}
            ping={ping}
            onEditPerson={(uid) => setEditor(peopleForEditor.find((p) => p.uid === uid) || null)}
          />
        ) : tab === "plan" ? (
          <PlanPane board={board} busy={busy} onSaved={() => void run(async () => undefined, "План сохранён")} />
        ) : tab === "shoot" ? (
          <ShootPane
            board={board}
            busy={busy}
            onPlan={(carId, plannedCampaign) => run(() => qualityApi.shoot({ action: "plan", carId, plannedCampaign }), "Линия")}
          />
        ) : tab === "people" ? (
          <PeoplePane people={peopleForEditor} onCreate={() => setEditor("new")} onEdit={setEditor} />
        ) : (
          <IgPane board={board} onReload={load} ping={ping} />
        )}
      </AdsScroller>

      <PersonEditor
        open={editor !== null}
        person={editing}
        onClose={() => setEditor(null)}
        onSaved={() => void load()}
      />

      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ads-ink px-4 py-2 text-sm text-ads-paper shadow-ads-float">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
