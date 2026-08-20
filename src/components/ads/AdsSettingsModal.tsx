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
import { Settings, Bell, Send, MessageSquare } from "lucide-react";

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
  const [botToken, setBotToken] = useState<string>(settings.botToken || "");
  const [chatId, setChatId] = useState<string>(settings.chatId || "");
  const [isActive, setIsActive] = useState<boolean>(
    settings.isActive !== undefined ? settings.isActive : true
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingCron, setIsTestingCron] = useState(false);
  const [isSendingSample, setIsSendingSample] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRk1Days(settings.rk1Days || 17);
      setRk2Days(settings.rk2Days || 14);
      setBotToken(settings.botToken || "");
      setChatId(settings.chatId || "");
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
        botToken: botToken.trim() || undefined,
        chatId: chatId.trim() || undefined,
        isActive,
      });
      onClose();
    } catch (err) {
      console.error("Error saving ads settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestTelegramAlert = async () => {
    try {
      setIsSendingSample(true);
      setTestResult(null);
      const res = await fetch("/api/ads/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: botToken.trim() || undefined,
          chatId: chatId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult("✅ Тестовое уведомление успешно отправлено в Telegram!");
      } else {
        setTestResult(`❌ Ошибка: ${data.error || "Не удалось отправить"}`);
      }
    } catch (err: any) {
      setTestResult(`❌ Ошибка: ${err.message}`);
    } finally {
      setIsSendingSample(false);
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
          `✅ Проверено ${data.totalActiveCars} авто. Отправлено ${data.alertsSent} уведомлений в Telegram.`
        );
      } else {
        setTestResult(`❌ Ошибка: ${data.error || "Не удалось отправить"}`);
      }
    } catch (err: any) {
      setTestResult(`❌ Ошибка: ${err.message}`);
    } finally {
      setIsTestingCron(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white text-zinc-900 border border-zinc-200 shadow-2xl rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-5 border-b border-zinc-100 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-500" />
            Настройки ротации и Telegram
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Days Limits */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700">
                  Лимит дней РК 1
                </Label>
                <div className="flex items-center gap-1.5">
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
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700">
                  Лимит дней РК 2
                </Label>
                <div className="flex items-center gap-1.5">
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
              </div>
            </div>

            {/* Telegram Configuration */}
            <div className="pt-2 border-t border-zinc-100 space-y-3">
              <div className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                Настройки Telegram бота
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700">
                  Токен бота (Bot Token)
                </Label>
                <Input
                  type="text"
                  placeholder="7969988440:AAEqIdBJZVZJ..."
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="bg-zinc-50 border-zinc-200 text-zinc-900 font-mono text-xs focus:bg-white rounded-lg h-9"
                />
                <p className="text-[10px] text-zinc-500">
                  Токен из @BotFather. Если пусто — используется общий бот CRM.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700">
                  ID группы или чата (Chat ID)
                </Label>
                <Input
                  type="text"
                  placeholder="-1002721193947"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  className="bg-zinc-50 border-zinc-200 text-zinc-900 font-mono text-xs focus:bg-white rounded-lg h-9"
                />
                <p className="text-[10px] text-zinc-500">
                  ID группы Telegram (начинается с -100). Если пусто — используется основной чат.
                </p>
              </div>
            </div>

            {/* Switch Active */}
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
                    Включить авто-уведомления
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Ежедневно проверять сроки и присылать отчёт о ротации
                  </div>
                </div>
              </label>
            </div>

            {/* Test Block */}
            <div className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-xl space-y-2.5">
              <div className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-zinc-500" />
                Тест отправки
              </div>
              <p className="text-[11px] text-zinc-500">
                Проверьте работу бота с указанными выше настройками:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestTelegramAlert}
                  disabled={isSendingSample}
                  className="bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 text-xs h-8 font-medium rounded-lg flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  {isSendingSample ? (
                    <>
                      <Spinner className="w-3.5 h-3.5" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-zinc-500" />
                      Тест в Telegram
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRunManualCron}
                  disabled={isTestingCron}
                  className="bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 text-xs h-8 font-medium rounded-lg flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  {isTestingCron ? (
                    <>
                      <Spinner className="w-3.5 h-3.5" />
                      Проверка...
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5 text-zinc-500" />
                      Проверить все авто
                    </>
                  )}
                </Button>
              </div>

              {testResult && (
                <div className="text-[11px] font-medium p-2.5 rounded-lg border bg-white shadow-2xs border-zinc-200 text-zinc-800">
                  {testResult}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-100 flex justify-end gap-2 flex-shrink-0">
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
