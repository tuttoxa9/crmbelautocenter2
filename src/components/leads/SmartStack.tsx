"use client";

import { Lead } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { LeadStackCard } from "./LeadStackCard";

interface SmartStackProps {
  leads: Lead[];
  type: "new" | "active";
}

export function SmartStack({ leads, type }: SmartStackProps) {
  if (leads.length === 0) {
    return (
      <div className="h-[600px] border-2 border-dashed border-zinc-200/80 rounded-[2rem] bg-zinc-50/50 flex flex-col items-center justify-center text-zinc-400">
        <p className="text-sm font-medium">Нет лидов</p>
      </div>
    );
  }

  const visibleLeads = leads.slice(0, 3);

  return (
    <div className="relative h-[600px] w-full">
      <AnimatePresence mode="popLayout">
        {visibleLeads.map((lead, index) => {
          const isTop = index === 0;
          let scale = 1;
          let y = 0;
          let opacity = 1;

          if (index === 1) {
            scale = 0.95;
            y = 20;
            opacity = 0.8;
          } else if (index === 2) {
            scale = 0.90;
            y = 40;
            opacity = 0.5;
          }

          return (
            <motion.div
              key={lead.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity, y, scale }}
              exit={{ x: '100%', opacity: 0, transition: { duration: 0.3 } }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ zIndex: 30 - index * 10 }}
              className="absolute w-full top-0 left-0"
            >
              <LeadStackCard lead={lead} isTop={isTop} type={type} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
