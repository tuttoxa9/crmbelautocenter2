import React from "react";
import { AdCar } from "@/lib/types";
import { X, CalendarDays, ArrowRight, Play, Video } from "lucide-react";
import { getPriceTierLabel } from "@/lib/services/adsService";

interface DailyTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  offset: number;
  cars: AdCar[];
}

export function DailyTasksModal({ isOpen, onClose, date, offset, cars }: DailyTasksModalProps) {
  if (!isOpen) return null;

  const rk1Cars = cars.filter(c => c.campaign === "rk1");
  const rk2Cars = cars.filter(c => c.campaign === "rk2");

  const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const title = offset === 0 
    ? "План на сегодня" 
    : offset === 1
    ? "План на завтра"
    : `План на ${date.getDate()} ${months[date.getMonth()]}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2 text-zinc-900">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg leading-tight">{title}</h2>
              <p className="text-[10px] sm:text-xs text-zinc-500 font-medium">Нужно отснять: {cars.length} авто</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200 transition-colors text-zinc-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {cars.length === 0 ? (
            <div className="text-center py-10 text-zinc-500">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                <CalendarDays className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="font-semibold text-zinc-900">На этот день задач нет</p>
              <p className="text-sm mt-1">Ни одна машина не выгорает в эту дату.</p>
            </div>
          ) : (
            <>
              {rk1Cars.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
                    <span className="bg-blue-600 text-white font-semibold text-[10px] px-2 py-0.5 rounded shadow-sm">РК 1</span>
                    <h3 className="font-semibold text-sm text-zinc-800">Выгорают из первой кампании ({rk1Cars.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {rk1Cars.map(car => (
                      <CarTaskRow key={car.id} car={car} />
                    ))}
                  </div>
                </div>
              )}

              {rk2Cars.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
                    <span className="bg-purple-600 text-white font-semibold text-[10px] px-2 py-0.5 rounded shadow-sm">РК 2</span>
                    <h3 className="font-semibold text-sm text-zinc-800">Выгорают из второй кампании ({rk2Cars.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {rk2Cars.map(car => (
                      <CarTaskRow key={car.id} car={car} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

function CarTaskRow({ car }: { car: AdCar }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/60 bg-white shadow-2xs hover:border-zinc-300 transition-colors">
      <div className="flex flex-col min-w-0">
        <div className="font-semibold text-sm text-zinc-900 truncate pr-2">{car.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-zinc-500 font-medium">
            {getPriceTierLabel(car.priceTier)}
          </span>
          <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
          <span className="text-[10px] text-zinc-500 font-medium">
            ${Number(car.priceUsd).toLocaleString("ru-RU")}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 border border-amber-100" title="Нужно снять новое видео">
          <Video className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
