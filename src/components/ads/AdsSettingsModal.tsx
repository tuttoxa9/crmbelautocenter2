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
import { Settings, Bell, Send, Check } from "lucide-react";

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
      setTestResult(`Ошибка: ${err.message}`);
    } finally {
      setIsTestingCron(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white text-zinc-900 border border-zinc-200 shadow-2xl rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-zinc-100">
          <DialogTitle className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-500" />
            Настройки ротации рекламы
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-700">
                Лимит дней для РК 1
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="90"
                  required
                  value={rk1Days}
                  onChange={(e) => setRk1Days(Number(e.target.value))}
                  className="bg-zinc-50 border-zinc-200 text-zinc-900 font-semibold focus:bg-white rounded-lg h-9"
                />
                <span className="text-xs text-zinc-500 font-medium">дней</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                По умолчанию 17 дней (~2.5 недели).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-700">
                Лимит дней для РК 2
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="90"
                  required
                  value={rk2Days}
                  onChange={(e) => setRk2Days(Number(e.target.value))}
                  className="bg-zinc-50 border-zinc-200 text-zinc-900 font-semibold focus:bg-white rounded-lg h-9"
                />
                <span className="text-xs text-zinc-500 font-medium">дней</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                По умолчанию 14 дней (2 недели).
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-100">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-medium text-zinc-800">
                    Включить Telegram-уведомления
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Отправлять сообщения в рабочий Telegram-чат при наступлении срока
                  </div>
                </div>
              </label>
            </div>

            <div className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-xl space-y-2">
              <div className="text-xs font-medium text-zinc-800 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-zinc-500" />
                Ручная проверка
              </div>
              <p className="text-[11px] text-zinc-500">
                Проверить все автомобили и отправить уведомления по тем, у кого вышел срок:
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRunManualCron}
                disabled={isTestingCron}
                className="w-full bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 text-xs h-8 font-medium rounded-lg flex items-center justify-center gap-1.5"
              >
                {isTestingCron ? (
                  <>
                    <Spinner className="w-3.5 h-3.5" />
                    Проверка...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-zinc-500" />
                    Проверить и отправить в Telegram
                  </>
                )}
              </Button>
              {testResult && (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  {testResult}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-100 text-xs rounded-lg h-9"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs rounded-lg h-9 px-4"
            >
              {isSaving ? (
                <>
                  <Spinner className="w-3.5 h-3.5 mr-1.5" />
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
