"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTelegramSettings, saveTelegramSettings, TelegramSettings } from "@/lib/settingsService";
import IntegrationsPage from "./integrations/page";
import { Bot, Link2, Send, CheckCircle2, AlertCircle, Loader2, CalendarRange } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
  const { user, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<"telegram" | "integrations">("telegram");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [settings, setSettings] = useState<TelegramSettings>({
    botToken: "",
    chatId: "",
    isActive: true,
    reminderRules: {}
  });

  const statusesList = [
    { id: "callback", label: "📞 Перезвонить" },
    { id: "visit", label: "🚗 Приезд" },
    { id: "new", label: "🆕 Новый лид" },
    { id: "in_progress", label: "⚙️ В работе" },
    { id: "thinking", label: "🤔 Думает" },
    { id: "no_answer", label: "📞🔇 Недозвон" },
  ];

  const reminderOptions = [
    { value: 0, label: "Не напоминать" },
    { value: 5, label: "За 5 минут" },
    { value: 10, label: "За 10 минут" },
    { value: 15, label: "За 15 минут" },
    { value: 20, label: "За 20 минут" },
    { value: 30, label: "За 30 минут" },
    { value: 60, label: "За 1 час" },
    { value: 120, label: "За 2 часа" },
    { value: 1440, label: "За 24 часа (сутки)" },
  ];

  useEffect(() => {
    async function loadSettings() {
      const data = await getTelegramSettings();
      if (data) {
        setSettings(data);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setToast(null);
    try {
      await saveTelegramSettings(settings);
      setToast({ type: "success", message: "Настройки успешно сохранены!" });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error(error);
      setToast({ type: "error", message: "Не удалось сохранить настройки." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.botToken || !settings.chatId) {
      setTestResult({ success: false, message: "Заполните Токен и Chat ID перед тестированием." });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch("/api/test-telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          botToken: settings.botToken,
          chatId: settings.chatId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: "Тестовое сообщение успешно отправлено в Telegram-группу!" });
      } else {
        setTestResult({ success: false, message: data.error || "Не удалось отправить тестовое сообщение." });
      }
    } catch (error: any) {
      console.error(error);
      setTestResult({ success: false, message: "Произошла ошибка при тестировании соединения." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRuleChange = (statusId: string, minutes: number) => {
    setSettings(prev => ({
      ...prev,
      reminderRules: {
        ...(prev.reminderRules || {}),
        [statusId]: minutes
      }
    }));
  };

  // Only admin has access to settings
  if (userRole !== "admin") {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-zinc-50">
        <div className="text-center text-zinc-500">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="font-semibold text-zinc-950">Доступ запрещен</p>
          <p className="text-sm mt-1">Требуются права администратора для изменения настроек.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-950">Настройки</h2>
        <p className="text-sm text-zinc-500 mt-1">Управление параметрами CRM и интеграциями</p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-zinc-200 bg-white px-6">
        <button
          onClick={() => setActiveTab("telegram")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "telegram"
              ? "border-zinc-950 text-zinc-950 font-bold"
              : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Bot className="w-4 h-4" />
          Настройка TG бота
        </button>
        <button
          onClick={() => setActiveTab("integrations")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "integrations"
              ? "border-zinc-950 text-zinc-950 font-bold"
              : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Link2 className="w-4 h-4" />
          Интеграции вебхуков
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "telegram" ? (
          <div className="max-w-2xl space-y-6">
            {toast && (
              <div
                className={`p-4 rounded-xl flex items-center gap-3 border animate-in fade-in duration-200 ${
                  toast.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {toast.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="text-sm font-medium">{toast.message}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              {/* Telegram Bot Credentials Card */}
              <Card className="border-zinc-200/85 shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Параметры Telegram бота</CardTitle>
                  <CardDescription>
                    Настройте автоматические уведомления о новых лидах в вашу Telegram-группу или канал.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-200/50">
                    <div className="space-y-0.5">
                      <Label htmlFor="telegram-active" className="text-sm font-bold text-zinc-800">
                        Включить уведомления
                      </Label>
                      <p className="text-xs text-zinc-500">
                        Отправлять оповещения при поступлении новых лидов
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="telegram-active"
                        type="checkbox"
                        checked={settings.isActive}
                        onChange={(e) => setSettings({ ...settings, isActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-950"></div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bot-token" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Токен бота (Bot Token)
                    </Label>
                    <Input
                      id="bot-token"
                      type="password"
                      placeholder="7969988440:AAEqIdBJZVZJ-pco6otAJAkSv2XiTEsi1Z4"
                      value={settings.botToken}
                      onChange={(e) => setSettings({ ...settings, botToken: e.target.value })}
                      className="h-11 px-4 text-sm border-zinc-200 focus:border-zinc-400 focus:ring-zinc-400 rounded-xl"
                    />
                    <p className="text-[11px] text-zinc-400">
                      Токен, полученный от бота <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-zinc-950 underline font-semibold">@BotFather</a>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chat-id" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      ID чата / группы (Chat ID)
                    </Label>
                    <Input
                      id="chat-id"
                      placeholder="-1002721193947"
                      value={settings.chatId}
                      onChange={(e) => setSettings({ ...settings, chatId: e.target.value })}
                      className="h-11 px-4 text-sm font-mono border-zinc-200 focus:border-zinc-400 focus:ring-zinc-400 rounded-xl"
                    />
                    <p className="text-[11px] text-zinc-400">
                      ID группы (обычно начинается с <code>-100</code>). Бот должен быть добавлен в группу.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="w-full sm:w-auto h-10 border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-full font-semibold transition-all px-6"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Тестирование...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Проверить связь с ботом
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Reminder Settings Card */}
              <Card className="border-zinc-200/85 shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <CalendarRange className="w-5 h-5 text-zinc-700" />
                    Настройка напоминаний о задачах
                  </CardTitle>
                  <CardDescription>
                    Выберите, за какое время до запланированного действия («След. шаг») отправлять напоминание в Telegram-группу для каждого статуса.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {statusesList.map(status => {
                      const currentValue = settings.reminderRules?.[status.id] ?? 0;
                      return (
                        <div key={status.id} className="flex flex-col gap-1.5 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/50">
                          <Label htmlFor={`status-rule-${status.id}`} className="text-xs font-bold text-zinc-600 tracking-wider">
                            {status.label}
                          </Label>
                          <Select
                            value={String(currentValue)}
                            onValueChange={(val) => handleRuleChange(status.id, Number(val))}
                          >
                            <SelectTrigger className="h-10 bg-white border border-zinc-200 rounded-xl focus:border-zinc-400 text-zinc-800 font-medium w-full">
                              <SelectValue placeholder="Выберите время" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-zinc-200 rounded-xl shadow-lg">
                              {reminderOptions.map(option => (
                                <SelectItem key={option.value} value={String(option.value)}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Submit Buttons */}
              <div className="flex pt-2">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full h-12 bg-zinc-950 hover:bg-zinc-800 text-white rounded-full font-bold transition-all shadow-[0_8px_30px_rgba(0,0,0,0.12)] text-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Сохранение всех настроек...
                    </>
                  ) : (
                    "Сохранить все настройки"
                  )}
                </Button>
              </div>
            </form>

            {testResult && (
              <div
                className={`p-4 rounded-xl flex items-start gap-3 border animate-in fade-in duration-200 ${
                  testResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-bold">{testResult.success ? "Связь установлена!" : "Ошибка проверки:"}</p>
                  <p className="text-xs mt-0.5 opacity-90">{testResult.message}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            <IntegrationsPage />
          </div>
        )}
      </div>
    </div>
  );
}
