"use client";

import { Lead, LeadStatus } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";
import { Search, Globe, Phone, Car, Clock, XCircle, Play } from "lucide-react";
import { updateLeadStatus } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { LEAD_STATUSES } from "@/constants/leadStatuses";

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

const formatTimeAgo = (timestamp: number) => {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ru });
};

export function LeadColumn({ leads, title, onSelectLead }: LeadColumnProps) {
  const { user } = useAuth();

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    if (!user?.email) return;
    try {
      await updateLeadStatus(leadId, newStatus, user.email, `Статус изменен на ${newStatus} через быструю кнопку`);
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[400px] mx-auto">
      {title && <h2 className="text-xl font-bold text-zinc-800 mb-6">{title} <span className="text-sm font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full ml-2">{leads.length}</span></h2>}

      <div className="flex flex-col gap-3 overflow-y-auto px-1 pb-4 max-h-[calc(100vh-12rem)] custom-scrollbar">
        <AnimatePresence>
          {leads.length === 0 && (
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

          {leads.map((lead) => {
            return (
              <motion.div
                key={lead.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="w-full rounded-2xl bg-white/80 backdrop-blur-md shadow-sm border border-zinc-200/60 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  if (onSelectLead) onSelectLead(lead);
                }}
              >
                <div className="p-4 flex flex-col gap-3">
                  {/* Header: Source & Time */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-zinc-100 rounded-xl">
                        {getSourceIcon(lead.source)}
                      </div>
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        {lead.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-zinc-400 bg-zinc-50 px-2 py-1 rounded-full">
                       <Clock className="w-3 h-3" />
                       {formatTimeAgo(lead.status === "new" ? lead.createdAt : (lead.history[lead.history.length-1]?.changedAt || lead.updatedAt))}
                    </div>
                  </div>

                  {/* Body: Name & Info */}
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-zinc-900 leading-tight">
                      {lead.name || "Без имени"}
                    </h3>
                    <div className="flex items-center gap-2 text-zinc-600 mt-1">
                       <Phone className="w-3.5 h-3.5 text-zinc-400" />
                       <span className="text-sm font-medium">{lead.phone}</span>
                    </div>
                    {lead.car && (
                      <div className="flex items-center gap-2 text-zinc-600">
                         <Car className="w-3.5 h-3.5 text-zinc-400" />
                         <span className="text-sm font-medium truncate">{lead.car}</span>
                      </div>
                    )}
                    {lead.status === "callback" && lead.nextActionDate && (
                      <div className="flex items-center gap-2 text-orange-600 mt-2 font-bold bg-orange-50 px-2 py-1 rounded-lg w-fit">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs">
                          Перезвонить: {new Date(lead.nextActionDate).toLocaleString('ru', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

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
