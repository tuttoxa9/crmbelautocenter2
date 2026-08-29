"use client";

import { useEffect, useState } from "react";
import { qualityApi } from "@/lib/quality/client";
import { laneLabel, type CrmPerson, type SmmLane } from "@/lib/quality/types";
import { Overlay, PrimaryBtn, Spinner } from "@/components/ads/chrome";
import { Field } from "./ui";
import { cn } from "@/lib/utils";

const EMPTY = { name: "", email: "", password: "", marker: "", lane: "rk1" as SmmLane, active: true };

export function PersonEditor({
  open,
  person,
  onClose,
  onSaved,
}: {
  open: boolean;
  person: CrmPerson | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = Boolean(person);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (person) {
      setForm({
        name: person.name,
        email: person.email,
        password: "",
        marker: person.marker,
        lane: person.lane,
        active: person.active,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, person]);

  const save = async () => {
    try {
      setBusy(true);
      setError(null);
      if (editing && person) {
        const body: Record<string, unknown> = {
          name: form.name,
          marker: form.marker,
          lane: form.lane,
          active: form.active,
        };
        if (form.password.length >= 6) body.password = form.password;
        await qualityApi.patchPerson(person.uid, body);
      } else {
        await qualityApi.createPerson({ ...form, role: "smm" });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Не сохранилось");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!person) return;
    try {
      setBusy(true);
      await qualityApi.deletePerson(person.uid);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Не удалось отключить");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay open={open} onClose={onClose}>
      <div className="ads-enter relative w-full max-w-lg rounded-t-3xl bg-ads-bg p-5 shadow-ads-float sm:rounded-3xl">
        <h2 className="text-lg font-semibold">{editing ? "Аккаунт" : "Новый человек"}</h2>
        <p className="mt-1 text-xs text-ads-muted">Логин в CRM. Кабинет — только «Мои цели».</p>
        <div className="mt-4 space-y-3">
          <Field label="Имя" value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
          <Field
            label="Почта"
            value={form.email}
            onChange={(email) => setForm((f) => ({ ...f, email }))}
            disabled={editing}
          />
          {editing ? (
            <p className="text-[11px] text-ads-subtle">Почту после создания не меняем. Новый пароль — если заполните поле ниже.</p>
          ) : null}
          <Field
            label={editing ? "Новый пароль (необязательно)" : "Пароль"}
            value={form.password}
            onChange={(password) => setForm((f) => ({ ...f, password }))}
            type="password"
          />
          <Field label="Код в подписи" value={form.marker} onChange={(marker) => setForm((f) => ({ ...f, marker }))} placeholder="sa  →  //sa" />
          <div>
            <p className="mb-1.5 text-xs font-medium text-ads-muted">Линия съёмки</p>
            <div className="grid grid-cols-4 gap-0.5 rounded-xl bg-ads-surface p-0.5">
              {(["rk1", "rk2", "both", "none"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, lane: id }))}
                  className={cn("h-8 rounded-lg text-xs", form.lane === id ? "bg-ads-card shadow-ads-pill" : "text-ads-muted")}
                >
                  {laneLabel(id)}
                </button>
              ))}
            </div>
          </div>
          {editing ? (
            <label className="flex items-center gap-2 text-sm text-ads-ink">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Аккаунт включён
            </label>
          ) : null}
          {error ? <p className="text-sm text-ads-danger">{error}</p> : null}
          <PrimaryBtn className="w-full" disabled={busy} onClick={() => void save()}>
            {busy ? <Spinner /> : null}
            {editing ? "Сохранить" : "Создать"}
          </PrimaryBtn>
          {editing ? (
            <button type="button" disabled={busy} onClick={() => void remove()} className="w-full text-center text-xs text-ads-danger">
              Отключить аккаунт
            </button>
          ) : null}
        </div>
      </div>
    </Overlay>
  );
}
