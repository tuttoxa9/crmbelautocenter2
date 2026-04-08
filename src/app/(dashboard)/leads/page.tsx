"use client";

import React, { useState, useEffect } from "react";
import { subscribeToLeads } from "@/lib/leadService";
import { Lead } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { DailyFeed } from "@/components/leads/DailyFeed";
import { DataTable } from "@/components/leads/DataTable";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { Plus } from "lucide-react";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "database">("feed");

  useEffect(() => {
    // Подписываемся на всех лидов, чтобы База Лидов (DataTable) отображала полную историю,
    // включая терминальные статусы (success, refusal, spam). Фильтрация происходит локально.
    // (В будущем здесь понадобится серверная пагинация для DataTable)
    const allStatuses: import("@/lib/types").LeadStatus[] = [
      "new", "in_progress", "visit", "no_answer", "thinking", "callback", "success", "refusal", "bank_refusal", "spam"
    ];
    const unsubscribe = subscribeToLeads((fetchedLeads) => {
      setLeads(fetchedLeads);
      setIsLoading(false);
    }, allStatuses);
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-background">
      {/* Top Navigation */}
      <header className="flex-none px-6 py-4 flex items-center justify-between border-b border-zinc-200/50 bg-white shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Задачи</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-100 p-1 rounded-lg">
            <button
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === "feed" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
              onClick={() => setActiveTab("feed")}
            >
              Рабочий стол
            </button>
            <button
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === "database" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
              onClick={() => setActiveTab("database")}
            >
              База Лидов
            </button>
          </div>

          <CreateLeadDialog>
            <button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg shadow-soft px-4 py-1.5 text-sm font-semibold transition-all flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Добавить
            </button>
          </CreateLeadDialog>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === "feed" ? (
          <div className="h-full overflow-hidden p-0">
            <DailyFeed leads={leads} />
          </div>
        ) : (
          <div className="h-full overflow-hidden p-6">
            <DataTable leads={leads} />
          </div>
        )}
      </main>
    </div>
  );
}
