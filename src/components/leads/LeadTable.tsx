"use client";

import { useState, useMemo } from "react";
import { Lead, LeadStatus, LeadSource, STATUS_MAP, SOURCE_MAP } from "@/types/lead";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Search, Copy, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { SourceBadge } from "./SourceBadge";
import { toast } from "sonner";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ru } from "date-fns/locale";
import { deleteLead } from "@/lib/leads";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface LeadTableProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onQuickStatusChange: (id: string, newStatus: LeadStatus) => void;
}

export function LeadTable({ leads, onEdit, onQuickStatusChange }: LeadTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(search.toLowerCase()) ||
                            lead.phone.includes(search);
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [leads, search, statusFilter, sourceFilter]);

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success("Номер скопирован");
  };

  const handleDelete = async () => {
    if (!leadToDelete) return;
    try {
      await deleteLead(leadToDelete);
      toast.success("Лид удалён");
    } catch (error) {
      toast.error("Ошибка при удалении");
      console.error(error);
    } finally {
      setLeadToDelete(null);
    }
  };

  const formatRelativeDate = (timestamp: any) => {
    if (!timestamp) return "";
    return formatDistanceToNowStrict(timestamp.toDate(), { addSuffix: true, locale: ru });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Поиск по имени или телефону..."
            className="pl-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={(val) => setSourceFilter(val || "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Источник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все источники</SelectItem>
              {Object.entries(SOURCE_MAP).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(statusFilter !== "all" || sourceFilter !== "all" || search !== "") && (
            <Button
              variant="ghost"
              onClick={() => {
                setStatusFilter("all");
                setSourceFilter("all");
                setSearch("");
              }}
            >
              Сбросить
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="w-[200px] font-semibold text-gray-700">Имя</TableHead>
                <TableHead className="font-semibold text-gray-700">Телефон</TableHead>
                <TableHead className="font-semibold text-gray-700">Источник</TableHead>
                <TableHead className="font-semibold text-gray-700">Статус</TableHead>
                <TableHead className="font-semibold text-gray-700">Запланировано</TableHead>
                <TableHead className="font-semibold text-gray-700">Создан</TableHead>
                <TableHead className="text-right font-semibold text-gray-700 w-[80px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{lead.name}</span>
                        {lead.carInterest && <span className="text-xs text-gray-500 font-normal truncate max-w-[180px]">{lead.carInterest}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center group">
                        <span className="mr-2">{lead.phone}</span>
                        <button
                          onClick={() => handleCopyPhone(lead.phone)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell><SourceBadge source={lead.source} /></TableCell>
                    <TableCell><StatusBadge status={lead.status} /></TableCell>
                    <TableCell>
                      {lead.plannedDate ? (
                        <div className="text-sm">
                          {format(lead.plannedDate.toDate(), "d MMM, HH:mm", { locale: ru })}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatRelativeDate(lead.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
                          <span className="sr-only">Открыть меню</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Изменить статус</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                                <DropdownMenuItem
                                  key={key}
                                  onClick={() => onQuickStatusChange(lead.id, key as LeadStatus)}
                                >
                                  {label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEdit(lead)}>
                            <Pencil className="mr-2 h-4 w-4" /> Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLeadToDelete(lead.id)} className="text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-gray-500">
                    Лиды не найдены
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!leadToDelete} onOpenChange={(open) => !open && setLeadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить лид?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Лид будет навсегда удалён из базы данных.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
