"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ExternalLink, Image as ImageIcon, Gauge, Calendar, Fuel } from "lucide-react";

interface CarPreviewProps {
  carId?: string;
  url?: string;
}

export function CarPreview({ carId, url }: CarPreviewProps) {
  const [car, setCar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Extract carId from URL if passsed but no carId
  const extractedId = carId || (url && url.includes("/catalog/") ? url.split("/catalog/")[1]?.split("?")[0] : null);

  useEffect(() => {
    async function fetchCar() {
      if (!extractedId) {
        setLoading(false);
        return;
      }
      try {
        if (!db) {
          console.error("Firestore database is null");
          setError(true);
          return;
        }
        const docRef = doc(db, "cars", extractedId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCar(docSnap.data());
        } else {
          setError(true);
        }
      } catch (e) {
        console.error(e);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchCar();
  }, [extractedId]);

  if (!extractedId) return null;

  if (loading) {
    return (
      <div className="mt-8 pt-6 border-t border-zinc-200/60 animate-pulse">
        <div className="h-4 w-32 bg-zinc-200 rounded mb-4"></div>
        <div className="h-24 w-full bg-zinc-100 rounded-xl"></div>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="mt-8 pt-6 border-t border-zinc-200/60">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2 mb-3">
          <ExternalLink className="w-3.5 h-3.5" /> Заинтересовавший авто
        </h3>
        <a 
          href={url || `https://belautocenter.by/catalog/${extractedId}`} 
          target="_blank" 
          rel="noreferrer"
          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
        >
          {url || `belautocenter.by/catalog/${extractedId}`}
        </a>
      </div>
    );
  }

  // Handle new and old image formats
  let imageUrl = null;
  if (car.imageUrls && car.imageUrls.length > 0) {
    const rawUrl = car.imageUrls[0];
    if (rawUrl.includes("imagekit.io")) {
      imageUrl = rawUrl;
    } else {
      imageUrl = `https://ik.imagekit.io/belautocenter/tr:w-400,h-300,cm-extract/${rawUrl.split('/').pop()}`;
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-zinc-200/60">
      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2 mb-3">
        Заинтересовавший авто
      </h3>
      
      <a 
        href={url || `https://belautocenter.by/catalog/${extractedId}`} 
        target="_blank"
        rel="noreferrer"
        className="group block bg-white rounded-xl border border-zinc-200 overflow-hidden hover:border-zinc-300 hover:shadow-md transition-all duration-200"
      >
        <div className="flex h-24">
          <div className="w-1/3 bg-zinc-100 relative flex items-center justify-center overflow-hidden shrink-0">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={car.make} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-zinc-300" />
            )}
          </div>
          <div className="w-2/3 p-3 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex justify-between items-start gap-1">
                <h4 className="font-bold text-sm text-zinc-900 truncate">
                  {car.make} {car.model}
                </h4>
                <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-xs font-bold text-orange-500 mt-0.5">
                {car.price ? `${car.price.toLocaleString()} $` : "Цена не указана"}
              </div>
            </div>
            
            <div className="flex gap-3 text-[10px] text-zinc-500 font-medium">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{car.year || "—"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                <span>{car.mileage ? `${car.mileage.toLocaleString()} км` : "—"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Fuel className="w-3 h-3" />
                <span>{car.engineVolume ? `${car.engineVolume} л` : "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}
