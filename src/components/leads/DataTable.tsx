"use client";

import React, { useState } from "react";
import { Lead } from "@/lib/types";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getSourceIcon } from "./Icons";
import { getStatusLabel, getStatusColor } from "@/lib/displayUtils";
import { Search, ArrowUpDown } from "lucide-react";

interface DataTableProps {
  leads: Lead[];
}

type SortField = "createdAt" | "name" | "phone" | "status" | "nextActionDate";
type SortOrder = "asc" | "desc";

export function DataTable({ leads }: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery.trim() ||
      lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.car?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSource = filterSource === "all" || lead.source === filterSource;
    const matchesStatus = filterStatus === "all" || lead.status === filterStatus;

    return matchesSearch && matchesSource && matchesStatus;
  });

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "createdAt":
        comparison = a.createdAt - b.createdAt;
        break;
      case "nextActionDate":
        comparison = (a.nextActionDate || 0) - (b.nextActionDate || 0);
        break;
      case "name":
        comparison = (a.name || "").localeCompare(b.name || "");
        break;
      case "phone":
        comparison = (a.phone || "").localeCompare(b.phone || "");
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  return (
    <div className="h-full flex flex-col bg-white rounded-[12px] shadow-soft border border-zinc-200 overflow-hidden">

      {/* Toolbar / Filters */}
      <div className="p-3 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Поиск по базе..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-zinc-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-zinc-400"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="py-1.5 px-3 text-sm bg-white border border-zinc-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Все статусы</option>
            <option value="new">Новые</option>
            <option value="in_progress">В работе</option>
            <option value="visit">Приезд</option>
            <option value="thinking">Думает</option>
            <option value="callback">Перезвонить</option>
            <option value="no_answer">Недозвон</option>
            <option value="success">Оформился</option>
            <option value="refusal">Отказ</option>
            <option value="bank_refusal">Отказ банка</option>
            <option value="spam">Брак/Тест</option>
          </select>

          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="py-1.5 px-3 text-sm bg-white border border-zinc-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Все источники</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="site">Сайт</option>
            <option value="call">Звонок</option>
            <option value="telegram">Telegram</option>
            <option value="zapier">Интеграция</option>
            <option value="walk_in">С улицы</option>
          </select>
        </div>

        <div className="text-sm text-zinc-500 font-medium whitespace-nowrap">
          Записей: {sortedLeads.length}
        </div>
      </div>

      {/* Table Data Grid */}
      <div className="flex-1 overflow-auto hide-scrollbar">
        <table className="w-full text-sm text-left min-w-[1000px]">
          <thead className="text-xs text-zinc-500 bg-zinc-50 uppercase tracking-wider sticky top-0 z-10 border-b border-zinc-200">
            <tr>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-zinc-100" onClick={() => handleSort("createdAt")}>
                <div className="flex items-center gap-1">Создан <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-4 py-3 font-semibold w-10 text-center">Ист.</th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-zinc-100" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1">Имя <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-zinc-100" onClick={() => handleSort("phone")}>
                <div className="flex items-center gap-1">Телефон <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-4 py-3 font-semibold">Авто</th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-zinc-100" onClick={() => handleSort("status")}>
                <div className="flex items-center gap-1">Статус <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-zinc-100" onClick={() => handleSort("nextActionDate")}>
                <div className="flex items-center gap-1">След. Контакт <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-4 py-3 font-semibold">Последняя заметка</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {sortedLeads.map((lead) => {
              const lastComment = lead.history?.slice().reverse().find(h => h.comment)?.comment || lead.notes || "—";

              return (
                <tr key={lead.id} className="hover:bg-zinc-50 transition-colors h-[40px] group">
                  <td className="px-4 py-2 text-zinc-500 whitespace-nowrap">
                    {format(new Date(lead.createdAt), "dd.MM.yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-2 text-zinc-400 flex justify-center">
                    {getSourceIcon(lead.source)}
                  </td>
                  <td className="px-4 py-2 font-medium text-zinc-900 truncate max-w-[150px]">
                    {lead.name || "Без имени"}
                  </td>
                  <td className="px-4 py-2 font-mono text-zinc-700 whitespace-nowrap">
                    {lead.phone}
                  </td>
                  <td className="px-4 py-2 text-zinc-600 truncate max-w-[150px]" title={lead.car}>
                    {lead.car || "—"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${getStatusColor(lead.status)}`}>
                      {getStatusLabel(lead.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-600 whitespace-nowrap">
                    {lead.nextActionDate
                      ? format(new Date(lead.nextActionDate), "dd.MM.yyyy HH:mm")
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-zinc-500 text-xs truncate max-w-[250px]" title={lastComment}>
                    {lastComment}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
