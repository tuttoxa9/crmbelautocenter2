"use client";

import { Lead, LeadStatus } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
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
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ru });
  } catch (e) {
    return "";
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
    <div className="flex flex-col h-full w-full min-w-[280px] sm:min-w-[320px] xl:min-w-[180px] max-w-[350px] xl:max-w-[calc(100%/6)] flex-1 shrink-0 xl:shrink">
      {title && (
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <h2 className="text-lg font-bold text-zinc-800 tracking-tight">{title}</h2>
          <span className="text-xs font-bold text-zinc-500 bg-zinc-200/50 px-2 py-0.5 rounded-full">{(leads || []).length}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 overflow-y-auto px-1 pb-4 flex-1 custom-scrollbar">
        <AnimatePresence>
          {(!leads || leads.length === 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center border-2 border-dashed border-zinc-200 rounded-3xl bg-zinc-50/50 py-10"
            >
              <div className="text-center opacity-50">
                <p className="text-lg font-medium text-zinc-600">Отлично!</p>
                <p className="text-sm text-zinc-500">Все карточки разобраны.</p>
              </div>
            </motion.div>
          )}

          {(leads || []).map((lead) => {
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
                  w-full shrink-0 rounded-2xl bg-white shadow-sm border overflow-hidden cursor-pointer
                  hover:shadow-md transition-all relative
                  ${isOverdue ? 'border-red-300 ring-1 ring-red-300/50' : 'border-zinc-200/80'}
                `}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  if (onSelectLead) onSelectLead(lead);
                }}
              >
                {/* Approaching Highlight */}
                {isApproaching && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-red-500 animate-pulse" />
                )}

                <div className="p-3 flex flex-col gap-2.5">
                  {/* Header: Status Badge & Source */}
                  <div className="flex justify-between items-start">
                     <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${getStatusColor(lead.status)}`}>
                       {getStatusLabel(lead.status)}
                     </span>

                     <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded-md">
                       {getSourceIcon(lead.source)}
                       <span className="truncate max-w-[80px]">{getSourceLabel(lead.source)}</span>
                     </div>
                  </div>

                  {/* Body: Name & Info */}
                  <div className="space-y-0.5">
                    <h3 className="text-base font-bold text-zinc-900 leading-tight truncate">
                      {lead.name || "Без имени"}
                    </h3>

                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1.5 text-zinc-600">
                         <Phone className="w-3.5 h-3.5 text-zinc-400" />
                         <span className="text-xs font-medium">{lead.phone}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-400">
                         {formatTimeAgo(lead.status === "new" ? lead.createdAt : (lead.history[lead.history.length-1]?.changedAt || lead.updatedAt))}
                      </div>
                    </div>

                    {lead.car && (
                      <div className="flex items-center gap-1.5 text-zinc-500 mt-1">
                         <Car className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                         <span className="text-xs font-medium truncate">{lead.car}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Date (Approaching/Overdue) */}
                  {lead.nextActionDate && (
                    <div className={`
                      flex items-center gap-1.5 px-2 py-1.5 rounded-xl w-full mt-1
                      ${isOverdue ? 'bg-red-50 text-red-700' : isApproaching ? 'bg-orange-50 text-orange-700' : 'bg-zinc-50 text-zinc-600'}
                    `}>
                      {isOverdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      <span className="text-[11px] font-bold">
                        {isOverdue ? 'Просрочено: ' : 'Назначено: '}
                        {new Date(lead.nextActionDate).toLocaleString('ru', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Quick Actions */}
                  {lead.status === "new" && (
                    <div className="flex gap-2 mt-2 pt-3 border-t border-zinc-100">
                       <button
                         className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                         onClick={(e) => { e.stopPropagation(); handleStatusChange(lead.id!, "in_progress"); }}
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

                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
