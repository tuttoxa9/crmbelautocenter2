"use client";

import React, { useState, useEffect } from "react";
import { subscribeToLeads } from "@/lib/leadService";
import { Lead } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { Plus } from "lucide-react";
import { LeadsQueue } from "@/components/leads/LeadsQueue";
import { LeadWorkspace } from "@/components/leads/LeadWorkspace";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    const activeStatuses: import("@/lib/types").LeadStatus[] = [
      "new", "in_progress", "visit", "no_answer", "thinking", "callback"
    ];
    const unsubscribe = subscribeToLeads((fetchedLeads) => {
      setLeads(fetchedLeads);
      setIsLoading(false);
    }, activeStatuses);
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* Middle Column (Queue) */}
      <div className="w-[380px] flex-shrink-0 border-r border-gray-200 bg-[#F4F5F7] flex flex-col overflow-hidden">
        <header className="flex-none p-4 border-b border-gray-200 bg-white flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-900">Задачи</h1>
          <CreateLeadDialog>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </CreateLeadDialog>
        </header>
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          <LeadsQueue
            leads={leads}
            selectedLeadId={selectedLeadId}
            onSelectLead={setSelectedLeadId}
          />
        </div>
      </div>

      {/* Right Column (Workspace) */}
      <div className="flex-1 bg-white flex flex-col overflow-hidden min-w-0">
        {selectedLead ? (
          <LeadWorkspace key={selectedLead.id} lead={selectedLead} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Выберите лида для работы</p>
          </div>
        )}
      </div>
    </div>
  );
}
