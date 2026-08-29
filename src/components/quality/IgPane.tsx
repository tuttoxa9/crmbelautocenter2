"use client";

import { useEffect, useState } from "react";
import { qualityApi } from "@/lib/quality/client";
import { GhostBtn, PrimaryBtn, Spinner } from "@/components/ads/chrome";
import { Field } from "./ui";
import type { Board } from "./boardTypes";
import type { CrmPerson } from "@/lib/quality/types";

export function IgPane({ board, onReload, ping }: { board: Board; onReload: () => Promise<void>; ping: (t: string) => void }) {
  const [igUserId, setIgUserId] = useState("");
  const [igToken, setIgToken] = useState("");
  const [hint, setHint] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [last, setLast] = useState<{ at: number | null; error: string | null; count?: number }>({ at: null, error: null });
  const [media, setMedia] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const s = await qualityApi.settings();
    setIgUserId(s.settings.igUserId || "");
    setHasToken(Boolean(s.settings.hasToken));
    setHint(s.settings.tokenHint || "");
    setLast({ at: s.settings.lastPollAt, error: s.settings.lastPollError, count: s.settings.lastPollCount });
    const ig = await qualityApi.ig("?unattributed=1");
    setMedia(ig.media || []);
  };

  useEffect(() => {
    void load().catch((e) => ping(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      await qualityApi.saveSettings({ igUserId, igToken });
      setIgToken("");
      await load();
      ping("Сохранено");
    } catch (e: any) {
      ping(e.message);
    } finally {
      setBusy(false);
    }
  };

  const poll = async () => {
    setBusy(true);
    try {
      const r = await qualityApi.igPoll();
      ping(r.skipped ? "Нет токена" : `Сняли ${r.count} объектов`);
      await load();
      await onReload();
    } catch (e: any) {
      ping(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <section className="rounded-2xl bg-ads-card p-4">
        <h2 className="text-sm font-semibold">Instagram Graph</h2>
        <p className="mt-1 text-xs text-ads-muted">
          Professional-аккаунт салона. Cron каждые 10 минут читает ленту и живые сторис. Рилс с кодом <span className="font-mono">//xx</span> в подписи зачтётся человеку. Сторис без подписи — в неразмеченное.
        </p>
        <div className="mt-3 space-y-3">
          <Field label="IG User ID" value={igUserId} onChange={setIgUserId} />
          <Field label={hasToken ? `Токен (${hint}) — вставьте новый, чтобы заменить` : "Long-lived токен"} value={igToken} onChange={setIgToken} />
          <div className="flex gap-2">
            <PrimaryBtn className="flex-1" disabled={busy} onClick={() => void save()}>
              {busy ? <Spinner /> : null}
              Сохранить
            </PrimaryBtn>
            <GhostBtn className="flex-1" disabled={busy} onClick={() => void poll()}>
              Опросить сейчас
            </GhostBtn>
          </div>
          <p className="text-[11px] text-ads-subtle">
            {last.error ? `Ошибка: ${last.error}` : last.at ? `Последний опрос ${new Date(last.at).toLocaleString("ru-RU")}` : "Ещё не опрашивали"}
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-2 px-1 text-xs font-medium text-ads-subtle">Неразмеченное · {media.length}</h3>
        {media.length === 0 ? (
          <p className="rounded-2xl bg-ads-card px-4 py-8 text-center text-sm text-ads-subtle">Пусто — либо всё разобрано, либо Graph ещё не подключён.</p>
        ) : (
          <div className="space-y-2">
            {media.map((m) => (
              <div key={m.id} className="flex gap-3 rounded-2xl bg-ads-card p-3">
                {m.thumbnail ? <img src={m.thumbnail} alt="" className="h-16 w-12 rounded-lg object-cover" /> : <div className="h-16 w-12 rounded-lg bg-ads-surface" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{m.source === "stories" ? "Сторис" : m.mediaType || "Пост"}</p>
                  <p className="truncate text-[11px] text-ads-muted">{m.caption || "без подписи"}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {board.people.map((p: CrmPerson) => (
                      <button
                        key={p.uid}
                        type="button"
                        className="rounded-md bg-ads-surface px-2 py-1 text-[11px]"
                        onClick={() => void qualityApi.igAssign(m.id, p.uid).then(load).then(onReload)}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
