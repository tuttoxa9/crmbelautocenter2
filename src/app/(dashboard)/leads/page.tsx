"use client";

import { Button } from "@/components/ui/button";
import { Plus, Search, Inbox, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
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
import { subscribeToLeads, deleteLead } from "@/lib/leadService";
import { Lead } from "@/lib/types";
import { getStatusLabel, getStatusColor, getSourceLabel } from "@/lib/displayUtils";
import { Badge } from "@/components/ui/badge";
import { format, isValid, isToday, isPast, isSameDay, startOfDay, addDays, subDays, isTomorrow } from "date-fns";
import { ru } from "date-fns/locale";
import { Trash2, Phone, PhoneOff, CalendarClock } from "lucide-react";

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

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all-status");
  const [sourceFilter, setSourceFilter] = useState<string>("all-source");
  const [dateFilter, setDateFilter] = useState<string>("all-dates");
  const [taskDateFilter, setTaskDateFilter] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const handlePrevDay = () => {
     const current = new Date(taskDateFilter + "T00:00:00");
     setTaskDateFilter(format(subDays(current, 1), "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
     const current = new Date(taskDateFilter + "T00:00:00");
     setTaskDateFilter(format(addDays(current, 1), "yyyy-MM-dd"));
  };

  const handleToday = () => {
     setTaskDateFilter(format(new Date(), "yyyy-MM-dd"));
  };

  const handleTomorrow = () => {
     const current = new Date();
     setTaskDateFilter(format(addDays(current, 1), "yyyy-MM-dd"));
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToLeads((data) => {
      setLeads(data);
      setLoading(false);
    });

    return () => unsubscribe();
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

  const handleDelete = async (leadId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этого лида?")) return;
    try {
      await deleteLead(leadId);
    } catch (error) {
      console.error("Error deleting lead:", error);
      alert("Ошибка при удалении");
    }
  };

  const tasksLeads = leads.filter(lead => {
     // Убираем с рабочей доски все "закрытые" статусы
     if (lead.status === "success" || lead.status === "refusal" || lead.status === "bank_refusal" || lead.status === "spam") return false;

     // Недозвоны всегда показываются во все дни, чтобы их можно было дожать
     if (lead.status === "no_answer") return true;

     const filterDate = startOfDay(new Date(taskDateFilter + "T00:00:00"));
     const isFilterToday = isToday(filterDate);

     // Если смотрим "Сегодня", то показываем все "Новые" лиды (которые нужно обработать)
     // ПЛЮС всех, у кого nextActionDate назначен на сегодня или просрочен
     if (isFilterToday) {
       if (lead.status === "new") return true;
       if (lead.nextActionDate) {
          return isToday(lead.nextActionDate) || isPast(lead.nextActionDate);
       }
       return false; // Если in_progress/visit, но без nextActionDate или с датой в будущем, сегодня не показываем
     }

     // Для будущих дней ("Завтра" и далее) показываем только тех, кто КОНКРЕТНО запланирован на этот день
     if (lead.nextActionDate) {
       return isSameDay(new Date(lead.nextActionDate), filterDate);
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
        <CreateLeadDialog>
          <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-6">
            <Plus className="mr-2 h-4 w-4" /> Добавить клиента
          </Button>
        </CreateLeadDialog>
      </div>

      <Tabs defaultValue="tasks" className="flex-1 flex flex-col">
        <TabsList className="mb-4 inline-flex w-fit bg-transparent p-0 space-x-6 border-b border-zinc-200 rounded-none h-auto">
          <TabsTrigger
            value="tasks"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent px-0 py-2 data-[state=active]:shadow-none text-zinc-500 data-[state=active]:text-zinc-900"
          >
            Рабочий день
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent px-0 py-2 data-[state=active]:shadow-none text-zinc-500 data-[state=active]:text-zinc-900"
          >
            Архив
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="flex-1 outline-none m-0 flex flex-col">
          <div className="flex flex-col flex-1 h-full">
            <div className="flex items-center gap-2 mb-6">
               <Button
                  variant={isToday(new Date(taskDateFilter + "T00:00:00")) ? "default" : "outline"}
                  size="sm"
                  onClick={handleToday}
                  className={`rounded-full h-8 px-4 ${isToday(new Date(taskDateFilter + "T00:00:00")) ? 'bg-zinc-900 text-white' : 'text-zinc-600 bg-white'}`}
               >
                  Сегодня
               </Button>
               <Button
                  variant={isTomorrow(new Date(taskDateFilter + "T00:00:00")) ? "default" : "outline"}
                  size="sm"
                  onClick={handleTomorrow}
                  className={`rounded-full h-8 px-4 ${isTomorrow(new Date(taskDateFilter + "T00:00:00")) ? 'bg-zinc-900 text-white' : 'text-zinc-600 bg-white'}`}
               >
                  Завтра
               </Button>
               <div className="relative flex items-center bg-white border border-zinc-200 rounded-full h-8 px-3 ml-2 hover:border-zinc-300 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-zinc-900 focus-within:ring-offset-1">
                 <CalendarClock className="h-4 w-4 text-zinc-400 mr-2" />
                 <input
                   type="date"
                   className="bg-transparent text-sm text-zinc-700 focus:outline-none cursor-pointer border-none p-0"
                   value={taskDateFilter}
                   onChange={(e) => setTaskDateFilter(e.target.value)}
                 />
               </div>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                <Spinner size="lg" className="mb-4 text-zinc-400" />
                <p>Загрузка доски...</p>
              </div>
            ) : tasksLeads.length === 0 && !isToday(new Date(taskDateFilter + "T00:00:00")) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                <Inbox className="h-10 w-10 mb-4 text-zinc-300" />
                <p className="text-base font-medium text-zinc-600">На этот день ничего не запланировано</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                 <KanbanBoard leads={tasksLeads} />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all" className="flex-1 outline-none flex flex-col space-y-4 m-0">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
            <div className="flex w-full md:w-auto items-center space-x-2 flex-1">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
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
                    {statusFilter === "all-status" ? "Все статусы" : getStatusLabel(statusFilter as Parameters<typeof getStatusLabel>[0])}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-status">Все статусы</SelectItem>
                  <SelectItem value="new">Новый</SelectItem>
                  <SelectItem value="visit">Приезд</SelectItem>
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
                    {sourceFilter === "all-source" ? "Все источники" : getSourceLabel(sourceFilter as Parameters<typeof getSourceLabel>[0])}
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

          <div className="flex-1 flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                <Spinner size="lg" className="mb-4 text-zinc-400" />
                <p>Загрузка базы...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-10">
                <Inbox className="h-8 w-8 mb-2 text-zinc-300" />
                <p className="text-base font-medium text-zinc-900">По вашему запросу ничего не найдено</p>
                <p className="text-sm">Попробуйте изменить фильтры</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-zinc-50 shadow-sm z-10">
                    <TableRow className="hover:bg-zinc-50">
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
                          <Badge variant="outline" className={`${getStatusColor(lead.status)} font-medium`}>
                            {getStatusLabel(lead.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-600">
                          {safeFormatDate(lead.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <LeadDrawer
                              lead={lead}
                              trigger={
                                <Button variant="ghost" size="sm" className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100">
                                  Открыть
                                </Button>
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
                              onClick={() => handleDelete(lead.id!)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
