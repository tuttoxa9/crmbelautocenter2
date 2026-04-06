"use client";

import { Lead, LeadStatus } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";
import { Search, Globe, Phone, Car, Clock, XCircle, Play } from "lucide-react";
import { updateLeadStatus } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";

interface SmartStackProps {
  leads: Lead[];
  title?: string;
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

export function SmartStack({ leads, title }: SmartStackProps) {
  const displayLeads = leads.slice(0, 3);
  const { user } = useAuth();

  // State for expanded cards. We map lead ID to boolean.
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    // Prevent toggle if clicking on a button inside the card.
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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

      <div className="relative h-[600px] w-full">
        <AnimatePresence>
          {leads.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-zinc-200 rounded-3xl bg-zinc-50/50"
            >
              <div className="text-center opacity-50">
                <p className="text-lg font-medium text-zinc-600">Отлично!</p>
                <p className="text-sm text-zinc-500">Все карточки разобраны.</p>
              </div>
            </motion.div>
          )}

          {displayLeads.map((lead, index) => {
            const isTop = index === 0;
            const isExpanded = expandedCards[lead.id!] || false;

            return (
              <motion.div
                key={lead.id}
                layout
                initial={{ opacity: 0, scale: 0.8, y: 100 }}
                animate={{
                  opacity: index === 0 ? 1 : index === 1 ? 0.8 : 0.5,
                  scale: index === 0 ? 1 : index === 1 ? 0.95 : 0.90,
                  y: index === 0 ? 0 : index === 1 ? 20 : 40,
                  zIndex: 30 - index * 10
                }}
                exit={{ x: 300, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`absolute w-full rounded-3xl bg-white/80 backdrop-blur-md shadow-xl border border-white/50 overflow-hidden cursor-pointer ${isTop ? 'ring-1 ring-black/5' : ''}`}
                onClick={(e) => toggleExpand(lead.id!, e)}
              >
                <div className="p-6 flex flex-col gap-4">
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
                    <h3 className="text-2xl font-bold text-zinc-900 leading-tight">
                      {lead.name || "Без имени"}
                    </h3>
                    <div className="flex items-center gap-2 text-zinc-600 mt-2">
                       <Phone className="w-4 h-4 text-zinc-400" />
                       <span className="font-medium">{lead.phone}</span>
                    </div>
                    {lead.car && (
                      <div className="flex items-center gap-2 text-zinc-600">
                         <Car className="w-4 h-4 text-zinc-400" />
                         <span className="font-medium truncate">{lead.car}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions (Only on top card) */}
                  {isTop && !isExpanded && lead.status === "new" && (
                    <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-100">
                       <button
                         className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors"
                         onClick={(e) => { e.stopPropagation(); handleStatusChange(lead.id!, "in_progress"); }}
                       >
                         <Play className="w-4 h-4" /> В работу
                       </button>
                       <button
                         className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors"
                         onClick={(e) => { e.stopPropagation(); handleStatusChange(lead.id!, "no_answer"); }}
                       >
                         <XCircle className="w-4 h-4" /> Недозвон
                       </button>
                    </div>
                  )}

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                         <div className="pt-4 mt-2 border-t border-zinc-100 space-y-4">
                           <div>
                             <h4 className="text-sm font-semibold text-zinc-900 mb-2">История статусов</h4>
                             <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                               {lead.history.slice().reverse().map((h, i) => (
                                 <div key={i} className="flex gap-2 text-xs">
                                   <div className="font-medium text-zinc-500 w-16 shrink-0">
                                     {formatTimeAgo(h.changedAt).replace(' назад', '')}
                                   </div>
                                   <div>
                                     <span className="font-semibold text-zinc-700">{h.status}</span>
                                     {h.comment && <span className="text-zinc-500 ml-1">- {h.comment}</span>}
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </div>

                           {/* Simplified input for notes/comment mockup */}
                           <div className="flex gap-2">
                             <input
                               type="text"
                               placeholder="Добавить комментарий..."
                               className="flex-1 text-sm bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
                               onClick={(e) => e.stopPropagation()}
                             />
                             <button className="bg-zinc-900 text-white px-3 rounded-xl text-sm font-medium">
                               OK
                             </button>
                           </div>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
