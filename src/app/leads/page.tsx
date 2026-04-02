"use client";

import { Button } from "@/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
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

export default function LeadsPage() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Лиды</h2>
          <p className="text-sm text-gray-500 mt-1">Управление заявками и контактами клиентов</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Добавить лид
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex w-full sm:w-auto items-center space-x-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Поиск по имени или телефону..."
              className="pl-9 w-full"
            />
          </div>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Select defaultValue="all-status">
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">Все статусы</SelectItem>
              <SelectItem value="new">Новый</SelectItem>
              <SelectItem value="contacted">Связались</SelectItem>
              <SelectItem value="visit_planned">Визит запланирован</SelectItem>
              <SelectItem value="arrived">Приехал</SelectItem>
              <SelectItem value="deal">Сделка</SelectItem>
              <SelectItem value="refusal">Отказ</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all-source">
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Источник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-source">Все источники</SelectItem>
              <SelectItem value="site">Сайт</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="call">Звонок</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all-dates">
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Дата" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-dates">За всё время</SelectItem>
              <SelectItem value="today">Сегодня</SelectItem>
              <SelectItem value="yesterday">Вчера</SelectItem>
              <SelectItem value="this-week">На этой неделе</SelectItem>
              <SelectItem value="this-month">В этом месяце</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[200px] font-semibold text-gray-700">Имя</TableHead>
                <TableHead className="font-semibold text-gray-700">Телефон</TableHead>
                <TableHead className="font-semibold text-gray-700">Источник</TableHead>
                <TableHead className="font-semibold text-gray-700">Статус</TableHead>
                <TableHead className="font-semibold text-gray-700">Дата визита/перезвона</TableHead>
                <TableHead className="font-semibold text-gray-700">Дата создания</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <Filter className="h-8 w-8 mb-2 text-gray-400" />
                    <p className="text-lg font-medium text-gray-900">Лидов пока нет</p>
                    <p className="text-sm">Здесь будут отображаться заявки от клиентов</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
