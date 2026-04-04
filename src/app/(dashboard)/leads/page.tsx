"use client";

import { Button } from "@/components/ui/button";
import { Plus, Search, Inbox, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { LeadDrawer } from "@/components/leads/LeadDrawer";
import { KanbanBoard } from "@/components/leads/KanbanBoard";
import { useEffect, useState } from "react";
import { getLeads } from "@/lib/leadService";
import { Lead } from "@/lib/types";
import { getStatusLabel, getStatusColor, getSourceLabel } from "@/lib/displayUtils";
import { Badge } from "@/components/ui/badge";
import { format, isValid } from "date-fns";
import { ru } from "date-fns/locale";

const safeFormatDate = (timestamp: unknown) => {
  if (!timestamp) return "—";

  // Handle Firestore Timestamp objects if they somehow get here
  let dateObj: Date;
  if (
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'seconds' in timestamp &&
    typeof (timestamp as { seconds: number }).seconds === 'number'
  ) {
    dateObj = new Date((timestamp as { seconds: number }).seconds * 1000);
  } else {
    dateObj = new Date(timestamp as string | number);
  }

  return isValid(dateObj) ? format(dateObj, "dd MMM yyyy, HH:mm", { locale: ru }) : "Некорректная дата";
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all-status");
  const [sourceFilter, setSourceFilter] = useState<string>("all-source");
  const [dateFilter, setDateFilter] = useState<string>("all-dates");

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await getLeads();
      setLeads(data);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Filter leads based on current state
  const filteredLeads = leads.filter(lead => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      lead.name.toLowerCase().includes(searchLower) ||
      lead.phone.toLowerCase().includes(searchLower) ||
      (lead.car && lead.car.toLowerCase().includes(searchLower));

    // Status filter
    const matchesStatus = statusFilter === "all-status" || lead.status === statusFilter;

    // Source filter
    const matchesSource = sourceFilter === "all-source" || lead.source === sourceFilter;

    // Date filter
    const now = new Date().getTime();
    const day = 24 * 60 * 60 * 1000;
    let matchesDate = true;
    if (dateFilter === "today") {
       matchesDate = (now - lead.createdAt) < day;
    } else if (dateFilter === "week") {
       matchesDate = (now - lead.createdAt) < 7 * day;
    } else if (dateFilter === "month") {
       matchesDate = (now - lead.createdAt) < 30 * day;
    }

    return matchesSearch && matchesStatus && matchesSource && matchesDate;
  });

  const { isToday, isPast } = require("date-fns");
  const todayLeads = leads.filter(lead => {
     if (lead.status === "success" || lead.status === "refusal" || lead.status === "bank_refusal" || lead.status === "spam") return false;

     if (lead.status === "new") return true;

     if (lead.nextActionDate) {
        return isToday(lead.nextActionDate) || isPast(lead.nextActionDate);
     }
     return false;
  });

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Лиды</h2>
          <p className="text-sm text-zinc-500 mt-1">Управление заявками и контактами клиентов</p>
        </div>
        <CreateLeadDialog onSuccess={fetchLeads}>
          <Button className="bg-zinc-900 hover:bg-zinc-800 text-white">
            <Plus className="mr-2 h-4 w-4" /> Добавить клиента
          </Button>
        </CreateLeadDialog>
      </div>

      <Tabs defaultValue="today" className="flex-1 flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="today">☀️ На сегодня</TabsTrigger>
          <TabsTrigger value="all">🗂 Все лиды</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="flex-1 outline-none m-0 flex flex-col">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex-1 flex flex-col h-full">
            <div className="p-4 border-b border-zinc-200 bg-zinc-50">
              <h3 className="font-semibold text-zinc-800">Задачи на сегодня</h3>
              <p className="text-sm text-zinc-500">Свежие заявки и запланированные визиты/звонки</p>
            </div>
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                <Spinner size="lg" className="mb-4 text-zinc-400" />
                <p>Загрузка лидов...</p>
              </div>
            ) : todayLeads.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8">
                <Inbox className="h-10 w-10 mb-4 text-zinc-300" />
                <p className="text-lg font-medium text-zinc-900">На сегодня задач нет</p>
                <p className="text-sm">Все новые заявки обработаны</p>
              </div>
            ) : (
              <div className="flex-1 p-4 overflow-y-auto">
                 <KanbanBoard leads={todayLeads} onLeadChange={fetchLeads} />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all" className="flex-1 outline-none flex flex-col space-y-4 m-0">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
            <div className="flex w-full sm:w-auto items-center space-x-2">
              <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200 mr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={`h-7 px-2 rounded-md ${viewMode === "table" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("kanban")}
                  className={`h-7 px-2 rounded-md ${viewMode === "kanban" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  type="text"
                  className="pl-9 w-full bg-zinc-50 border-zinc-200 focus-visible:ring-zinc-900"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex w-full sm:w-auto items-center gap-2">
              <Select value={dateFilter} onValueChange={(val) => setDateFilter(val || "all-dates")}>
                <SelectTrigger className="w-[140px] bg-zinc-50 border-zinc-200">
                  <SelectValue>
                    {dateFilter === "all-dates" ? "Все время" : dateFilter === "today" ? "За сегодня" : dateFilter === "week" ? "За неделю" : "За месяц"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-dates">Все время</SelectItem>
                  <SelectItem value="today">За сегодня</SelectItem>
                  <SelectItem value="week">За неделю</SelectItem>
                  <SelectItem value="month">За месяц</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all-status")}>
                <SelectTrigger className="w-[160px] bg-zinc-50 border-zinc-200">
                  <SelectValue>
                    {statusFilter === "all-status" ? "Все статусы" : getStatusLabel(statusFilter as any)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-status">Все статусы</SelectItem>
                  <SelectItem value="new">Новый</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="visit">Приезд</SelectItem>
                  <SelectItem value="visited_or_refused">Приехал/отказ</SelectItem>
                  <SelectItem value="refusal">Отказ</SelectItem>
                  <SelectItem value="bank_refusal">Отказ банка</SelectItem>
                  <SelectItem value="success">Оформился/купил</SelectItem>
                  <SelectItem value="no_answer">Недозвон</SelectItem>
                  <SelectItem value="spam">Брак/Тест</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={(val) => setSourceFilter(val || "all-source")}>
                <SelectTrigger className="w-[160px] bg-zinc-50 border-zinc-200">
                  <SelectValue>
                    {sourceFilter === "all-source" ? "Все источники" : getSourceLabel(sourceFilter as any)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-source">Все источники</SelectItem>
                  <SelectItem value="site">Сайт</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="call">Звонок</SelectItem>
                  <SelectItem value="zapier">Zapier/Avito</SelectItem>
                  <SelectItem value="walk_in">С улицы</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={`flex-1 flex flex-col ${viewMode === "table" ? "bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden" : ""}`}>
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-zinc-200 text-zinc-400">
                <Spinner size="lg" className="mb-4 text-zinc-400" />
                <p>Загрузка лидов...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-white rounded-xl border border-zinc-200 p-10">
                <Inbox className="h-8 w-8 mb-2 text-zinc-300" />
                <p className="text-base font-medium text-zinc-900">Ничего не найдено</p>
                <p className="text-sm">Попробуйте изменить фильтры поиска</p>
              </div>
            ) : viewMode === "kanban" ? (
              <KanbanBoard leads={filteredLeads} onLeadChange={fetchLeads} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                      <TableHead className="w-[250px] font-medium text-zinc-600">Клиент</TableHead>
                      <TableHead className="font-medium text-zinc-600">Автомобиль</TableHead>
                      <TableHead className="font-medium text-zinc-600">Источник</TableHead>
                      <TableHead className="font-medium text-zinc-600">Статус</TableHead>
                      <TableHead className="font-medium text-zinc-600">Создан</TableHead>
                      <TableHead className="text-right font-medium text-zinc-600">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div className="font-medium text-zinc-900">{lead.name}</div>
                          <div className="text-sm text-zinc-500">{lead.phone}</div>
                        </TableCell>
                        <TableCell className="text-zinc-600">{lead.car || "—"}</TableCell>
                        <TableCell className="text-zinc-600">{getSourceLabel(lead.source)}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(lead.status)} text-white border-transparent`}>
                            {getStatusLabel(lead.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-600">
                          {safeFormatDate(lead.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <LeadDrawer
                            lead={lead}
                            onChange={fetchLeads}
                            trigger={
                              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                Открыть
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
