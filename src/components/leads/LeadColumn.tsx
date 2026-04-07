"use client";

import { Lead, LeadStatus } from "@/lib/types";
import { format, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";
import { Search, Globe, Phone, Car, Clock, XCircle, Play, AlertCircle } from "lucide-react";
import { updateLeadStatus } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { LEAD_STATUSES } from "@/constants/leadStatuses";
import { getSourceLabel, getStatusLabel, getStatusColor } from "@/lib/displayUtils";

interface LeadColumnProps {
  leads: Lead[];
  title?: string;
  onSelectLead?: (lead: Lead) => void;
}

const getSourceIcon = (source: string) => {
  switch (source) {
    case 'instagram': return <InstagramIcon className="w-5 h-5 text-pink-600" />;
    case 'tiktok': return <TikTokIcon className="w-5 h-5 text-black" />;
    case 'site': return <Globe className="w-5 h-5 text-blue-600" />;
    case 'telegram': return <TelegramIcon className="w-5 h-5 text-sky-500" />;
    default: return <Search className="w-5 h-5 text-zinc-400" />;
  }
};

const formatTimeAgo = (timestamp: number | null | undefined) => {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Вчера, " + format(date, "HH:mm");
    return format(date, "d MMM, HH:mm", { locale: ru });
  } catch (e) {
    return "";
  }
};

const getLeadDateGroup = (timestamp: number | null | undefined) => {
  if (!timestamp) return "Неизвестно";
  try {
    const date = new Date(timestamp);
    if (isToday(date)) return "Сегодня";
    if (isYesterday(date)) return "Вчера";
    return format(date, "d MMMM yyyy", { locale: ru });
  } catch (e) {
    return "Неизвестно";
  }
};

export function LeadColumn({ leads, title, onSelectLead }: LeadColumnProps) {
  const { user } = useAuth();
  const now = new Date().getTime();

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    if (!user?.email) return;
    try {
      await updateLeadStatus(leadId, newStatus, user.email, `Статус изменен на ${newStatus} через быструю кнопку`);
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  return (
    <div className="flex flex-col h-full w-full min-w-[280px] lg:min-w-[320px]">
      {title && (
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <h2 className="text-lg font-semibold text-zinc-700 tracking-tight">{title}</h2>
          <span className="text-xs font-medium text-gray-600 bg-gray-200 px-2.5 py-0.5 rounded-full">{(leads || []).length}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 overflow-y-auto px-1 pb-4 flex-1 custom-scrollbar">
        <AnimatePresence>
          {(() => {
            const groups: { [key: string]: Lead[] } = {};
            (leads || []).forEach(lead => {
              const timestampToUse = lead.nextActionDate || (lead.status === "new" ? lead.createdAt : (lead.history[lead.history.length-1]?.changedAt || lead.updatedAt));
              const group = getLeadDateGroup(timestampToUse);
              if (!groups[group]) groups[group] = [];
              groups[group].push(lead);
            });

            // Define order for "Сегодня" and "Вчера"
            const groupOrder = ["Сегодня", "Вчера"];
            const sortedGroups = Object.keys(groups).sort((a, b) => {
              const aIndex = groupOrder.indexOf(a);
              const bIndex = groupOrder.indexOf(b);
              if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
              if (aIndex !== -1) return -1;
              if (bIndex !== -1) return 1;
              // Simple string sort for other dates (ideally parse and sort by date, but string is okay for now since we usually filter by today)
              return b.localeCompare(a);
            });

            return sortedGroups.map(group => (
              <div key={group} className="flex flex-col gap-3 w-full">
                <div className="flex items-center justify-center pt-2 pb-1">
                  <span className="bg-zinc-100 text-zinc-500 text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-wider">
                    {group}
                  </span>
                </div>
                {groups[group].map(lead => {
                  const isApproaching = lead.nextActionDate && (lead.nextActionDate - now) > 0 && (lead.nextActionDate - now) < 2 * 60 * 60 * 1000;
                  const isOverdue = lead.nextActionDate && (now - lead.nextActionDate) > 0;

                  return (
                    <motion.div
                      key={lead.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className={`
                        w-full shrink-0 min-w-0 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] cursor-pointer
                        hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all relative
                        ${isOverdue ? 'ring-1 ring-red-300/50' : ''}
                      `}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        if (onSelectLead) onSelectLead(lead);
                      }}
                    >
                      {/* Approaching Highlight */}
                      {isApproaching && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-red-500 animate-pulse rounded-t-[12px]" />
                      )}

                      <div className="p-4 flex flex-col gap-3">
                        {/* Header: Status Badge & Source */}
                        <div className="flex justify-between items-center w-full">
                           <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md ${getStatusColor(lead.status)}`}>
                             {getStatusLabel(lead.status)}
                           </span>

                           <div className="flex items-center opacity-70">
                             {getSourceIcon(lead.source)}
                           </div>
                        </div>

                        {/* Body: Name & Info */}
                        <div className="flex flex-col min-w-0 mt-1">
                          <h3 className="text-[16px] font-semibold text-[#111827] leading-tight truncate">
                            {lead.name || "Без имени"}
                          </h3>

                          <div className="flex items-center justify-between mt-2 w-full min-w-0 gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                               <Phone className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                               <span className="text-[13px] text-[#6B7280] whitespace-nowrap truncate">{lead.phone}</span>
                            </div>
                          </div>

                          {lead.car && (
                            <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                               <Car className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                               <span className="text-[13px] text-[#6B7280] truncate">{lead.car}</span>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions (only for new) */}
                        {lead.status === "new" && (
                          <div className="flex gap-2 mt-2">
                             <button
                               className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 if (onSelectLead) onSelectLead(lead);
                               }}
                             >
                               <Play className="w-3.5 h-3.5" /> В работу
                             </button>
                             <button
                               className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                               onClick={(e) => { e.stopPropagation(); handleStatusChange(lead.id!, "no_answer"); }}
                             >
                               <XCircle className="w-3.5 h-3.5" /> Недозвон
                             </button>
                          </div>
                        )}

                        {/* Footer: Action Date */}
                        {lead.nextActionDate && (
                          <div className={`
                            flex items-center gap-1.5 mt-2 pt-3 border-t border-gray-100
                            ${isOverdue ? 'text-red-600' : isApproaching ? 'text-orange-600' : 'text-[#6B7280]'}
                          `}>
                            {isOverdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            <span className="text-[12px] font-medium">
                              Назначено: {new Date(lead.nextActionDate).toLocaleString('ru', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                        )}

                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ));
          })()}
        </AnimatePresence>
      </div>
    </div>
  );
}
