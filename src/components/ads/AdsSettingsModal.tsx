"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AdsSettings } from "@/lib/types";
import { Settings, Bell, CheckCircle2, AlertTriangle, Send } from "lucide-react";

interface AdsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AdsSettings;
  onSaveSettings: (settings: Partial<AdsSettings>) => Promise<void>;
}

export function AdsSettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}: AdsSettingsModalProps) {
  const [rk1Days, setRk1Days] = useState<number>(settings.rk1Days || 17);
  const [rk2Days, setRk2Days] = useState<number>(settings.rk2Days || 14);
  const [isActive, setIsActive] = useState<boolean>(
    settings.isActive !== undefined ? settings.isActive : true
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingCron, setIsTestingCron] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRk1Days(settings.rk1Days || 17);
      setRk2Days(settings.rk2Days || 14);
      setIsActive(settings.isActive !== undefined ? settings.isActive : true);
      setTestResult(null);
    }
  }, [isOpen, settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSaveSettings({
        rk1Days: Number(rk1Days) || 17,
        rk2Days: Number(rk2Days) || 14,
        isActive,
      });
      onClose();
    } catch (err) {
      console.error("Error saving ads settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunManualCron = async () => {
    try {
      setIsTestingCron(true);
      setTestResult(null);
      const res = await fetch("/api/cron/ads-reminders?force=true");
      const data = await res.json();
      if (data.success) {
        setTestResult(
          `Проверено ${data.totalActiveCars} авто. Отправлено ${data.alertsSent} уведомлений в Telegram.`
        );
      } else {
        setTestResult(`Ошибка: ${data.error || "Не удалось отправить"}`);
      }
    } catch (err: any) {
      setTestResult(`Ошибка вызова: ${err.message}`);
    } finally {
      setIsTestingCron(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Настройки сроков ротации рекламы
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold flex items-center justify-between">
                <span>Лимит дней для РК 1</span>
                <span className="text-xs text-blue-400 font-normal">Видео Владельца</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="90"
                  required
                  value={rk1Days}
                  onChange={(e) => setRk1Days(Number(e.target.value))}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 font-bold"
                />
                <span className="text-xs text-zinc-400">дней</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                По умолчанию 17 дней (~2.5 недели). По истечении этого срока придет уведомление о ротации.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold flex items-center justify-between">
                <span>Лимит дней для РК 2</span>
                <span className="text-xs text-purple-400 font-normal">Видео SMM</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="90"
                  required
                  value={rk2Days}
                  onChange={(e) => setRk2Days(Number(e.target.value))}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 font-bold"
                />
                <span className="text-xs text-zinc-400">дней</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                По умолчанию 14 дней (2 недели).
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-800/80">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-semibold text-zinc-200">
                    Включить Telegram-уведомления
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Отправлять алерты в общий рабочий Telegram-чат
                  </div>
                </div>
              </label>
            </div>

            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                Ручная проверка и тест
              </div>
              <p className="text-[11px] text-zinc-400">
                Запустить проверку всех автомобилей и отправить уведомления по тем, у кого вышел срок:
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRunManualCron}
                disabled={isTestingCron}
                className="w-full border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs h-8 flex items-center justify-center gap-1.5"
              >
                {isTestingCron ? (
                  <>
                    <Spinner className="w-3.5 h-3.5" />
                    Проверка...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-blue-400" />
                    Проверить и отправить в Telegram
                  </>
                )}
              </Button>
              {testResult && (
                <div className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-800/40">
                  {testResult}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-800 flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-zinc-800 text-zinc-400 hover:text-white"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Сохранение...
                </>
              ) : (
                "Сохранить настройки"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
