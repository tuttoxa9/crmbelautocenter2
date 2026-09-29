"use client";

import React, { useState } from "react";
import { ShieldAlert, Lock, X, AlertTriangle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function isValidIp(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  const ipv4 = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  if (ipv4.test(trimmed)) return true;
  return trimmed.includes(":") && /^[0-9a-fA-F:]{3,45}$/.test(trimmed);
}

interface BlockIpModalProps {
  isOpen: boolean;
  ip?: string;
  leadId?: string;
  leadName?: string;
  onClose: () => void;
  onSuccess?: (ip: string) => void;
}

export function BlockIpModal({
  isOpen,
  ip = "",
  leadId,
  leadName,
  onClose,
  onSuccess,
}: BlockIpModalProps) {
  const { user } = useAuth();
  const validInitialIp = isValidIp(ip) ? ip.trim() : "";
  const [targetIp, setTargetIp] = useState(validInitialIp);
  const [password, setPassword] = useState("");
  const [markSpam, setMarkSpam] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Сброс полей при каждом открытии модалки, чтобы не оставалось старых значений или автозаполнения
  React.useEffect(() => {
    if (isOpen) {
      setTargetIp(isValidIp(ip) ? ip.trim() : "");
      setPassword("");
      setError(null);
      setSuccess(false);
    }
  }, [ip, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const cleanIp = targetIp.trim();
    if (!cleanIp) {
      setError("Укажите IP адрес для блокировки");
      return;
    }
    if (!isValidIp(cleanIp)) {
      setError("Введите корректный IP адрес (например: 178.120.45.12)");
      return;
    }
    if (!password.trim()) {
      setError("Введите пароль от админки");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/leads/block-ip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: cleanIp,
          password: password.trim(),
          leadId,
          userEmail: user?.email || undefined,
          markSpam,
          reason: leadName ? `Заявка от ${leadName}` : "Блокировка из CRM",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Не удалось заблокировать IP");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.(cleanIp);
        onClose();
        setSuccess(false);
        setPassword("");
      }, 1400);
    } catch (err: any) {
      setError(err?.message || "Ошибка при блокировке IP");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && password.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasPresetIp = Boolean(validInitialIp);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#18181b] border border-white/10 p-6 shadow-2xl text-zinc-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <button
          onClick={onClose}
          disabled={loading}
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">
              Блокировка по IP
            </h3>
            <p className="text-xs text-zinc-400">
              Защита от спама и недобросовестных заявок
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <p className="text-sm font-medium text-emerald-300">
              IP {targetIp} успешно заблокирован!
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Все новые заявки с этого адреса будут бесшумно отсекаться сайтом.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">IP адрес нарушителя:</span>
                {hasPresetIp && (
                  <span className="font-mono font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/20">
                    {targetIp}
                  </span>
                )}
              </div>

              {!hasPresetIp && (
                <div className="space-y-1">
                  <input
                    type="text"
                    name="manual_blocked_ip_address_field"
                    id="manual_blocked_ip_address_field"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    value={targetIp}
                    onChange={(e) => {
                      setTargetIp(e.target.value);
                      setError(null);
                    }}
                    placeholder="Например: 178.120.45.12"
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-xs text-red-300 placeholder:text-zinc-600 focus:outline-none focus:border-red-500/60 transition-all"
                  />
                  <p className="text-[10px] text-zinc-500">
                    У этой заявки не был записан IP адрес (старая заявка). Введите IP вручную.
                  </p>
                </div>
              )}

              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Сайт <strong className="text-zinc-400">belautocenter.by</strong> перестанет
                создавать заявки и слать уведомления в Telegram с этого IP.
              </p>
            </div>

            {leadId && (
              <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={markSpam}
                  onChange={(e) => setMarkSpam(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-red-500/40 w-4 h-4 cursor-pointer"
                />
                <span>Пометить текущую заявку как «Брак/Спам»</span>
              </label>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Пароль от админки
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  name="admin_password_verification_no_autofill"
                  id="admin_password_verification_no_autofill"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Введите пароль администратора"
                  className="w-full pl-9 pr-3 py-2 bg-black/50 border border-white/10 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400 animate-in fade-in-0">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !password.trim() || (!hasPresetIp && !targetIp.trim())}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-900/30 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Проверка...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Заблокировать IP
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
