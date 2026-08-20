"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Loader2, Video, Car, CheckCircle2 } from "lucide-react";
import { auth } from "@/lib/firebase";

interface AdCar {
  id: string;
  name: string;
  year: string;
  photoUrl: string;
  campaign: string;
  videoUrl?: string;
}

export default function SmmUploadClient() {
  const [cars, setCars] = useState<AdCar[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCar, setSelectedCar] = useState<AdCar | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");

  // Guest Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCars();
    
    // Fake Browser Verification
    setShowVerification(true);
    setIsVerifying(true);
    
    const duration = Math.random() * 1000 + 1500; // 1.5s to 2.5s
    const timer = setTimeout(() => {
      setIsVerifying(false);
      setVerificationSuccess(true);
      
      // Hide after success
      setTimeout(() => {
        setShowVerification(false);
      }, 1000);
    }, duration);
    
    return () => clearTimeout(timer);
  }, []);

  const fetchCars = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/ads/cars");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data.success) {
        setCars(data.cars);
      }
    } catch (err: any) {
      console.error(err);
      setError("Ошибка загрузки списка авто.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCars = cars.filter((car) =>
    car.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedCar) {
      setError("Пожалуйста, сначала выберите автомобиль.");
      return;
    }

    if (!file.type.startsWith("video/")) {
      setError("Пожалуйста, выберите видео файл.");
      return;
    }

    // Reset state
    setError("");
    setUploadSuccess(false);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const user = auth?.currentUser;
      const token = user ? await user.getIdToken() : "";

      // 1. Get presigned URL
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const presignedRes = await fetch("/api/s3/presigned", {
        method: "POST",
        headers,
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "video/mp4",
          prefix: "videos/smm/"
        }),
      });

      if (!presignedRes.ok) throw new Error("Failed to get upload URL");
      
      const { url, key } = await presignedRes.json();
      const videoUrl = `https://belautocenter.72bb8ab6e404181c3422963f832c005e.r2.cloudflarestorage.com/${key}`;

      // 2. Upload file directly to S3/R2 using XMLHttpRequest to track progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(null);
          } else {
            reject(new Error(`S3 upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.send(file);
      });

      // 3. Update AdCar in Database
      const updatePayload: any = { videoUrl };
      // Only move to ready_for_ads if it was currently waiting for a video
      if (selectedCar.campaign === "waiting_video") {
        updatePayload.campaign = "ready_for_ads";
      }

      const updateRes = await fetch(`/api/ads/cars/${selectedCar.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!updateRes.ok) throw new Error("Failed to update car status");

      setUploadSuccess(true);
      
      // Remove car from list
      setCars(prev => prev.filter(c => c.id !== selectedCar.id));
      
      setTimeout(() => {
        setSelectedCar(null);
        setUploadSuccess(false);
        setSearchQuery("");
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ошибка загрузки. Попробуйте еще раз.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col items-center pt-6 sm:pt-12 px-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900">Загрузка видео</h1>
        </div>

        {!selectedCar ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Поиск по названию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 h-10 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-zinc-900 bg-white"
              />
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                </div>
              ) : filteredCars.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  Нет автомобилей
                </div>
              ) : (
                filteredCars.map((car) => (
                  <button
                    key={car.id}
                    onClick={() => setSelectedCar(car)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                        {car.photoUrl ? (
                          <img src={car.photoUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Car className="w-5 h-5 text-zinc-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-zinc-900 truncate">{car.name}</div>
                        <div className="text-xs text-zinc-500">{car.year}</div>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0 ml-2">
                      <CheckCircle2 className="w-4 h-4 opacity-0" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 sm:p-6 space-y-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedCar(null)}
                className="text-sm text-blue-600 font-medium hover:underline flex-shrink-0"
              >
                ← Назад
              </button>
              <div className="font-semibold text-base sm:text-lg text-zinc-900 truncate">{selectedCar.name}</div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-xl border border-rose-200">
                {error}
              </div>
            )}

            {uploadSuccess ? (
              <div className="py-10 flex flex-col items-center justify-center text-emerald-600 space-y-3">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <p className="font-semibold text-center">Видео успешно загружено!</p>
                <p className="text-xs text-emerald-600/70 text-center">
                  {selectedCar.campaign === "waiting_video" 
                    ? "Автомобиль переведен в ожидание запуска" 
                    : "Видео прикреплено к автомобилю"}
                </p>
              </div>
            ) : (
              <label className={`block border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-colors ${
                isUploading ? "border-blue-300 bg-blue-50" : "border-zinc-200 hover:border-blue-400 hover:bg-zinc-50"
              }`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                
                <div className="flex flex-col items-center space-y-3">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <div className="font-semibold text-blue-900">Загрузка... {uploadProgress}%</div>
                      <div className="w-full max-w-xs h-2 bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 mb-2">
                        <Video className="w-6 h-6" />
                      </div>
                      <div className="font-semibold text-zinc-900 px-4">Нажмите чтобы выбрать видео</div>
                      <div className="text-xs text-zinc-500">До 1 ГБ, MP4/MOV</div>
                    </>
                  )}
                </div>
              </label>
            )}
          </div>
        )}
      </div>
      
      {/* Fake Verification Toast */}
      <div 
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 transition-all duration-500 z-50 ${
          showVerification ? "translate-y-0 opacity-100" : "translate-y-[150%] opacity-0"
        }`}
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-sm font-medium">Проверка браузера...</span>
          </>
        ) : verificationSuccess ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">Проверка пройдена</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
