"use client";

import { useState } from "react";
import { Lead } from "@/lib/types";
import { updateLeadStatus } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { Globe, Search, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { InstagramIcon, TikTokIcon, TelegramIcon } from "./Icons";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface LeadStackCardProps {
  lead: Lead;
  isTop: boolean;
  type: "new" | "active";
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

export function LeadStackCard({ lead, isTop, type }: LeadStackCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();

  const handleStatusUpdate = async (e: React.MouseEvent, newStatus: Lead["status"]) => {
    e.stopPropagation();
    if (!user || !lead.id) return;

    try {
      await updateLeadStatus(lead.id, newStatus, user.email || "Unknown");
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const timeInStatus = lead.history.length > 0
    ? lead.history[lead.history.length - 1].changedAt
    : lead.createdAt;

  return (
    <motion.div
      layout
      onClick={() => setIsExpanded(!isExpanded)}
      className="w-full bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-zinc-200/50 cursor-pointer overflow-hidden flex flex-col gap-4"
    >
      <motion.div layout className="flex justify-between items-start">
        <div className="flex gap-4 items-center">
          <div className="p-3 bg-zinc-100 rounded-2xl shrink-0">
            {getSourceIcon(lead.source)}
          </div>
          <div>
            <h4 className="font-bold text-xl text-zinc-900 leading-tight">
              {lead.name || "Новая заявка"}
            </h4>
            {lead.car && <p className="text-zinc-600 font-medium text-sm mt-1">{lead.car}</p>}
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">В статусе</span>
          <span className="text-sm font-medium text-zinc-700 flex items-center gap-1 mt-0.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDistanceToNow(timeInStatus, { locale: ru })}
          </span>
        </div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 border-t border-zinc-100 space-y-4">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Телефон</p>
                <p className="text-zinc-800 font-medium">{lead.phone}</p>
              </div>

              {lead.notes && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Заметки</p>
                  <p className="text-sm text-zinc-700 bg-zinc-50 p-3 rounded-xl">{lead.notes}</p>
                </div>
              )}

              {lead.history && lead.history.length > 0 && (
                 <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">История</p>
                    <div className="flex flex-col gap-2">
                       {lead.history.slice().reverse().slice(0, 3).map((h, i) => (
                          <div key={i} className="text-xs flex items-center gap-2">
                            <span className="text-zinc-400">{new Date(h.changedAt).toLocaleDateString('ru')}</span>
                            <span className="font-medium text-zinc-700">{h.status}</span>
                          </div>
                       ))}
                    </div>
                 </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-2 flex gap-3 z-10"
          >
            {type === "new" && (
              <>
                <Button
                  onClick={(e) => handleStatusUpdate(e, "in_progress")}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md transition-transform active:scale-95"
                >
                  В работу
                </Button>
                <Button
                  onClick={(e) => handleStatusUpdate(e, "no_answer")}
                  variant="outline"
                  className="flex-1 rounded-xl transition-transform active:scale-95 border-zinc-200"
                >
                  Недозвон
                </Button>
              </>
            )}

            {type === "active" && (
              <>
                <Button
                  onClick={(e) => handleStatusUpdate(e, "visit")}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white rounded-xl shadow-md transition-transform active:scale-95"
                >
                  Назначить приезд
                </Button>
                <Button
                  onClick={(e) => handleStatusUpdate(e, "refusal")}
                  variant="outline"
                  className="flex-1 rounded-xl transition-transform active:scale-95 border-zinc-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Отказ
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-zinc-300">
        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </div>
    </motion.div>
  );
}
