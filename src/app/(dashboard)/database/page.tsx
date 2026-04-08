"use client";

import React, { useState, useEffect } from "react";
import { subscribeToLeads } from "@/lib/leadService";
import { Lead } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { DataTable } from "@/components/leads/DataTable";

export default function DatabasePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Подписываемся на всех лидов (нет фильтрации по статусам), чтобы База Лидов отображала полную историю
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
    <div className="h-full w-full flex flex-col p-6 overflow-hidden">
      <div className="flex-none mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">База Лидов</h1>
      </div>
      <div className="flex-1 min-h-0">
        <DataTable leads={leads} />
      </div>
    </div>
  );
}
