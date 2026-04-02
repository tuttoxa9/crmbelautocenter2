"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lead, LeadStatus } from "@/types/lead";
import { subscribeToLeads, updateLead } from "@/lib/leads";
import { LeadForm } from "@/components/leads/LeadForm";
import { TodayView } from "@/components/leads/TodayView";
import { LeadTable } from "@/components/leads/LeadTable";
import { CalendarView } from "@/components/leads/CalendarView";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster, toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timestamp } from "firebase/firestore";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Quick status change with date modal
  const [quickDateModalOpen, setQuickDateModalOpen] = useState(false);
  const [quickStatusData, setQuickStatusData] = useState<{id: string, status: LeadStatus} | null>(null);
  const [quickDateTime, setQuickDateTime] = useState<string>("");

  useEffect(() => {
    const unsubscribe = subscribeToLeads((data) => {
      setLeads(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingLead(null);
    setFormOpen(true);
  };

  const handleQuickStatusChange = async (id: string, newStatus: LeadStatus) => {
    if (newStatus === "callback" || newStatus === "visit_planned") {
      setQuickStatusData({ id, status: newStatus });
      setQuickDateTime("");
      setQuickDateModalOpen(true);
      return;
    }

    try {
      // For other statuses, reset plannedDate
      await updateLead(id, {
        status: newStatus,
        plannedDate: null
      });
      toast.success("Статус обновлен");
    } catch (error) {
      console.error(error);
      toast.error("Ошибка обновления статуса");
    }
  };

  const handleQuickDateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStatusData || !quickDateTime) return;

    try {
      await updateLead(quickStatusData.id, {
        status: quickStatusData.status,
        plannedDate: Timestamp.fromDate(new Date(quickDateTime))
      });
      toast.success("Статус и время обновлены");
      setQuickDateModalOpen(false);
      setQuickStatusData(null);
    } catch (error) {
      console.error(error);
      toast.error("Ошибка сохранения");
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <Toaster position="bottom-right" richColors />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Лиды</h2>
          <p className="text-sm text-gray-500 mt-1">Управление заявками и контактами клиентов</p>
        </div>
        <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Добавить лид
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-[300px] rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-[200px] rounded-xl" />
            <Skeleton className="h-[200px] rounded-xl" />
            <Skeleton className="h-[200px] rounded-xl" />
          </div>
        </div>
      ) : (
        <Tabs defaultValue="today" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
            <TabsTrigger value="today">📅 Сегодня</TabsTrigger>
            <TabsTrigger value="all">📋 Все лиды</TabsTrigger>
            <TabsTrigger value="calendar">📆 Календарь</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden relative">
            <TabsContent value="today" className="m-0 h-full overflow-y-auto pr-2 custom-scrollbar">
              <TodayView
                leads={leads}
                onEdit={handleEdit}
                onQuickStatusChange={handleQuickStatusChange}
              />
            </TabsContent>

            <TabsContent value="all" className="m-0 h-full flex flex-col">
              <LeadTable
                leads={leads}
                onEdit={handleEdit}
                onQuickStatusChange={handleQuickStatusChange}
              />
            </TabsContent>

            <TabsContent value="calendar" className="m-0 h-full overflow-y-auto">
              <CalendarView
                leads={leads}
                onEdit={handleEdit}
                onQuickStatusChange={handleQuickStatusChange}
              />
            </TabsContent>
          </div>
        </Tabs>
      )}

      {/* Main Edit/Create Form */}
      <LeadForm
        open={formOpen}
        onOpenChange={setFormOpen}
        lead={editingLead}
      />

      {/* Quick Date Modal for Status Change */}
      <Dialog open={quickDateModalOpen} onOpenChange={setQuickDateModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Выберите дату и время</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuickDateSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="quickDate">
                {quickStatusData?.status === "callback" ? "Когда перезвонить?" : "Когда визит?"}
              </Label>
              <Input
                id="quickDate"
                type="datetime-local"
                value={quickDateTime}
                onChange={(e) => setQuickDateTime(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setQuickDateModalOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" className="bg-blue-600">Сохранить</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
