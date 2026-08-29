"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTelegramSettings, saveTelegramSettings, TelegramSettings } from "@/lib/settingsService";
import { deleteLeadsByStatusAndDateRange } from "@/lib/leadService";
import { LEAD_STATUSES } from "@/constants/leadStatuses";
import { LeadStatus } from "@/lib/types";
import IntegrationsPage from "./integrations/page";
import { Bot, Link2, Send, CheckCircle2, AlertCircle, Loader2, CalendarRange, ChevronDown, Check, Trash2, ShieldAlert, LayoutGrid } from "lucide-react";

interface CustomSelectProps {
  value: number;
  onChange: (value: number) => void;
  options: { value: number; label: string }[];
  openUpward?: boolean;
}

function CustomSelect({ value, onChange, options, openUpward }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, [isOpen]);

  return (
    <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full h-11 px-4 text-sm bg-[#141416] border border-white/10 rounded-2xl outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-all font-semibold text-zinc-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] hover:bg-white/[0.04] cursor-pointer"
      >
        <span>{currentOption.label}</span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-50 left-0 right-0 p-1.5 bg-[#141416] border border-white/10 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in duration-150 ease-out ${
          openUpward ? "bottom-full mb-2 slide-in-from-bottom-2" : "top-full mt-2 slide-in-from-top-2"
        }`}>
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-xl text-left transition-colors cursor-pointer ${
                option.value === value
                  ? "bg-white text-black font-semibold"
                  : "text-zinc-300 hover:bg-white/[0.08]"
              }`}
            >
              <span>{option.label}</span>
              {option.value === value && <Check className="w-4 h-4 text-black" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InterfaceSettings() {
  return (
    <div className="mt-2 rounded-2xl border border-white/10 bg-[#141416] p-5">
      <p className="font-semibold text-zinc-100">Лиды</p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-500">
        В разделе теперь три режима: <b>День</b> (приезды и перезвоны по дате), <b>Авто</b> (склад и клиенты на машину) и <b>База</b> (вся история). Переключатель — сверху в самих Лидах.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const { user, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<"interface" | "telegram" | "integrations" | "cleanup">("interface");
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

  // --- Cleanup state ---
  const [cleanupStatus, setCleanupStatus] = useState<LeadStatus | "">("")
  const [cleanupDateFrom, setCleanupDateFrom] = useState("");
  const [cleanupDateTo, setCleanupDateTo] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ type: "success" | "error"; message: string; count?: number } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedStatusLabel = LEAD_STATUSES.find(s => s.value === cleanupStatus)?.label || "";

  const handleCleanup = useCallback(async () => {
    if (!cleanupStatus || !cleanupDateFrom || !cleanupDateTo) return;

    const dateFrom = new Date(cleanupDateFrom);
    dateFrom.setHours(0, 0, 0, 0);
    const dateTo = new Date(cleanupDateTo);
    dateTo.setHours(23, 59, 59, 999);

    if (dateFrom.getTime() > dateTo.getTime()) {
      setDeleteResult({ type: "error", message: "Дата \"От\" не может быть позже даты \"До\"." });
      return;
    }

    setIsDeleting(true);
    setDeleteResult(null);
    setShowConfirm(false);

    try {
      const count = await deleteLeadsByStatusAndDateRange(
        cleanupStatus as LeadStatus,
        dateFrom.getTime(),
        dateTo.getTime()
      );

      if (count === 0) {
        setDeleteResult({ type: "success", message: "Заявок для удаления не найдено.", count: 0 });
      } else {
        setDeleteResult({ type: "success", message: `Успешно удалено ${count} заявок.`, count });
      }
    } catch (error) {
      console.error(error);
      setDeleteResult({ type: "error", message: "Произошла ошибка при удалении заявок." });
    } finally {
      setIsDeleting(false);
    }
  }, [cleanupStatus, cleanupDateFrom, cleanupDateTo]);

  // Only admin has access to settings
  if (userRole !== "admin") {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-black">
        <div className="text-center text-zinc-500">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="font-semibold text-zinc-100">Доступ запрещен</p>
          <p className="text-sm mt-1">Требуются права администратора для изменения настроек.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#141416] px-6 py-5">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Настройки</h2>
        <p className="text-sm text-zinc-500 mt-1">Управление параметрами CRM и интеграциями</p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-white/10 bg-[#141416] px-6 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab("interface")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "interface"
              ? "border-white text-white font-bold"
              : "border-transparent text-zinc-500 hover:text-white"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Интерфейс
        </button>
        <button
          onClick={() => setActiveTab("telegram")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "telegram"
              ? "border-white text-white font-bold"
              : "border-transparent text-zinc-500 hover:text-white"
          }`}
        >
          <Bot className="w-4 h-4" />
          Настройка TG бота
        </button>
        <button
          onClick={() => setActiveTab("integrations")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "integrations"
              ? "border-white text-white font-bold"
              : "border-transparent text-zinc-500 hover:text-white"
          }`}
        >
          <Link2 className="w-4 h-4" />
          Интеграции вебхуков
        </button>
        <button
          onClick={() => setActiveTab("cleanup")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "cleanup"
              ? "border-white text-white font-bold"
              : "border-transparent text-zinc-500 hover:text-white"
          }`}
        >
          <Trash2 className="w-4 h-4" />
          Очистка базы
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "interface" ? (
          <div className="max-w-2xl space-y-6">
            <Card className="border-white/10 shadow-sm bg-[#141416] rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-zinc-300" />
                  Версия интерфейса CRM
                </CardTitle>
                <CardDescription>
                  Выберите, какую версию интерфейса использовать на этом компьютере.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <InterfaceSettings />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : activeTab === "telegram" ? (
          <div className="max-w-2xl space-y-6">
            {toast && (
              <div
                className={`p-4 rounded-xl flex items-center gap-3 border animate-in fade-in duration-200 ${
                  toast.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-red-500/10 border-red-500/20 text-red-300"
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
              <Card className="border-white/10 shadow-sm bg-[#141416] rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Параметры Telegram бота</CardTitle>
                  <CardDescription>
                    Настройте автоматические уведомления о новых лидах в вашу Telegram-группу или канал.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-white/[0.04] rounded-2xl border border-white/10">
                    <div className="space-y-0.5">
                      <Label htmlFor="telegram-active" className="text-sm font-bold text-zinc-200">
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
                      <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-100 after:border-white/15 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white peer-checked:after:bg-black"></div>
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
                      className="h-11 px-4 text-sm border-white/10 focus:border-zinc-400 focus:ring-zinc-400 rounded-xl"
                    />
                    <p className="text-[11px] text-zinc-400">
                      Токен, полученный от бота <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-zinc-100 underline font-semibold">@BotFather</a>.
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
                      className="h-11 px-4 text-sm font-mono border-white/10 focus:border-zinc-400 focus:ring-zinc-400 rounded-xl"
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
                      className="w-full sm:w-auto h-10 border-white/10 hover:bg-white/[0.06] text-zinc-300 rounded-full font-semibold transition-all px-6"
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
              <Card className="border-white/10 shadow-sm bg-[#141416] rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <CalendarRange className="w-5 h-5 text-zinc-300" />
                    Настройка напоминаний о задачах
                  </CardTitle>
                  <CardDescription>
                    Выберите, за какое время до запланированного действия («След. шаг») отправлять напоминание в Telegram-группу для каждого статуса.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {statusesList.map((status, index) => {
                      const currentValue = settings.reminderRules?.[status.id] ?? 0;
                      return (
                        <div key={status.id} className="flex flex-col gap-1.5 p-3.5 bg-white/[0.04] rounded-2xl border border-white/10">
                          <Label htmlFor={`status-rule-${status.id}`} className="text-xs font-bold text-zinc-400 tracking-wider">
                            {status.label}
                          </Label>
                          <CustomSelect
                            value={currentValue}
                            onChange={(val) => handleRuleChange(status.id, val)}
                            options={reminderOptions}
                            openUpward={index >= 2}
                          />
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
                  className="w-full h-12 bg-white hover:bg-zinc-200 text-black rounded-full font-bold transition-all text-sm"
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
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-red-500/10 border-red-500/20 text-red-300"
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
        ) : activeTab === "integrations" ? (
          <div className="animate-in fade-in duration-200">
            <IntegrationsPage />
          </div>
        ) : (
          <div className="max-w-2xl space-y-6 animate-in fade-in duration-200">
            {/* Cleanup result toast */}
            {deleteResult && (
              <div
                className={`p-4 rounded-xl flex items-center gap-3 border animate-in fade-in duration-200 ${
                  deleteResult.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-red-500/10 border-red-500/20 text-red-300"
                }`}
              >
                {deleteResult.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <span className="text-sm font-medium">{deleteResult.message}</span>
              </div>
            )}

            <Card className="border-white/10 shadow-sm bg-[#141416] rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-zinc-300" />
                  Удаление заявок по статусу
                </CardTitle>
                <CardDescription>
                  Выберите статус и период — все заявки с этим статусом, созданные в указанном диапазоне дат, будут безвозвратно удалены.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Status selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Статус заявок
                  </Label>
                  <div className="relative">
                    <select
                      value={cleanupStatus}
                      onChange={(e) => {
                        setCleanupStatus(e.target.value as LeadStatus | "");
                        setDeleteResult(null);
                        setShowConfirm(false);
                      }}
                      className="w-full h-11 px-4 pr-10 text-sm bg-[#141416] border border-white/10 rounded-2xl outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-all font-semibold text-zinc-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] hover:bg-white/[0.04] cursor-pointer appearance-none"
                    >
                      <option value="">Выберите статус...</option>
                      {LEAD_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* Date range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Дата от
                    </Label>
                    <Input
                      type="date"
                      value={cleanupDateFrom}
                      onChange={(e) => {
                        setCleanupDateFrom(e.target.value);
                        setDeleteResult(null);
                        setShowConfirm(false);
                      }}
                      className="h-11 px-4 text-sm border-white/10 focus:border-zinc-400 focus:ring-zinc-400 rounded-xl font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Дата до
                    </Label>
                    <Input
                      type="date"
                      value={cleanupDateTo}
                      onChange={(e) => {
                        setCleanupDateTo(e.target.value);
                        setDeleteResult(null);
                        setShowConfirm(false);
                      }}
                      className="h-11 px-4 text-sm border-white/10 focus:border-zinc-400 focus:ring-zinc-400 rounded-xl font-semibold"
                    />
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-2">
                  {!showConfirm ? (
                    <Button
                      type="button"
                      disabled={!cleanupStatus || !cleanupDateFrom || !cleanupDateTo || isDeleting}
                      onClick={() => setShowConfirm(true)}
                      className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold transition-all shadow-[0_8px_30px_rgba(220,38,38,0.18)] text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить заявки
                    </Button>
                  ) : (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-red-300">Подтвердите удаление</p>
                          <p className="text-xs text-red-600 mt-0.5">
                            Будут безвозвратно удалены все заявки со статусом <strong>«{selectedStatusLabel}»</strong> за период <strong>{cleanupDateFrom}</strong> — <strong>{cleanupDateTo}</strong>.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          disabled={isDeleting}
                          onClick={handleCleanup}
                          className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-sm transition-all"
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Удаление...
                            </>
                          ) : (
                            "Да, удалить"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isDeleting}
                          onClick={() => setShowConfirm(false)}
                          className="flex-1 h-10 border-white/10 hover:bg-white/[0.06] text-zinc-300 rounded-full font-semibold text-sm"
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
