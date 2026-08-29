"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Loader2, Video, Car, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { auth } from "@/lib/firebase";

interface AdCar {
  id: string;
  name: string;
  year: string;
  photoUrl: string;
  campaign: string;
  videoUrl?: string;
  videoCoverUrl?: string;
}

export default function SmmUploadClient() {
  const [cars, setCars] = useState<AdCar[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCar, setSelectedCar] = useState<AdCar | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgressVideo, setUploadProgressVideo] = useState(0);
  const [uploadSuccessVideo, setUploadSuccessVideo] = useState(false);
  
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgressPhoto, setUploadProgressPhoto] = useState(0);
  const [uploadSuccessPhoto, setUploadSuccessPhoto] = useState(false);

  const [error, setError] = useState("");

  // Guest Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  const deleteOldFile = async (url: string) => {
    if (!url) return;
    try {
      const match = url.match(/cloudflarestorage\.com\/(.+)$/);
      if (match && match[1]) {
        const key = match[1];
        if (key.startsWith("videos/smm/")) {
          const user = auth?.currentUser;
          const token = user ? await user.getIdToken() : "";
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          await fetch("/api/s3/delete", {
            method: "POST",
            headers,
            body: JSON.stringify({ keys: [key] })
          });
        }
      }
    } catch (err) {
      console.error("Failed to delete old file:", err);
    }
  };

  const handleUpload = async (file: File, type: "video" | "photo") => {
    if (!selectedCar) {
      setError("Пожалуйста, сначала выберите автомобиль.");
      return;
    }

    if (type === "video" && !file.type.startsWith("video/")) {
      setError("Пожалуйста, выберите видео файл.");
      return;
    }

    if (type === "photo" && !file.type.startsWith("image/")) {
      setError("Пожалуйста, выберите изображение.");
      return;
    }

    // Reset state
    setError("");
    if (type === "video") {
      setUploadSuccessVideo(false);
      setIsUploadingVideo(true);
      setUploadProgressVideo(0);
    } else {
      setUploadSuccessPhoto(false);
      setIsUploadingPhoto(true);
      setUploadProgressPhoto(0);
    }

    try {
      const user = auth?.currentUser;
      const token = user ? await user.getIdToken() : "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // 1. Delete old file if replacing
      if (type === "video" && selectedCar.videoUrl) {
        await deleteOldFile(selectedCar.videoUrl);
      }
      if (type === "photo" && selectedCar.videoCoverUrl) {
        await deleteOldFile(selectedCar.videoCoverUrl);
      }

      // 2. Get presigned URL
      const presignedRes = await fetch("/api/s3/presigned", {
        method: "POST",
        headers,
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          prefix: "videos/smm/" // Use smm prefix to allow anonymous uploads
        }),
      });

      if (!presignedRes.ok) throw new Error("Failed to get upload URL");
      
      const { url, key } = await presignedRes.json();
      const newFileUrl = `https://belautocenter.72bb8ab6e404181c3422963f832c005e.r2.cloudflarestorage.com/${key}`;

      // 3. Upload file directly to S3/R2 using XMLHttpRequest
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            if (type === "video") setUploadProgressVideo(percent);
            else setUploadProgressPhoto(percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(null);
          else reject(new Error(`S3 upload failed with status ${xhr.status}`));
        });

        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // 4. Update AdCar in Database
      const updatePayload: any = {};
      if (type === "video") {
        updatePayload.videoUrl = newFileUrl;
        // Only move to ready_for_ads if it was currently waiting for a video
        if (selectedCar.campaign === "waiting_video") {
          updatePayload.campaign = "ready_for_ads";
        }
      } else {
        updatePayload.videoCoverUrl = newFileUrl;
      }

      const updateRes = await fetch(`/api/ads/cars/${selectedCar.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!updateRes.ok) throw new Error("Failed to update car status");

      if (type === "video") setUploadSuccessVideo(true);
      else setUploadSuccessPhoto(true);

      // Update local state so user sees new files if they stay on page
      setSelectedCar((prev) => prev ? { ...prev, ...updatePayload } : null);
      
      // Update in main list
      setCars(prev => prev.map(c => c.id === selectedCar.id ? { ...c, ...updatePayload } : c));
      
      setTimeout(() => {
        if (type === "video") setUploadSuccessVideo(false);
        else setUploadSuccessPhoto(false);
      }, 4000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ошибка загрузки. Попробуйте еще раз.");
    } finally {
      if (type === "video") {
        setIsUploadingVideo(false);
        setUploadProgressVideo(0);
        if (videoInputRef.current) videoInputRef.current.value = "";
      } else {
        setIsUploadingPhoto(false);
        setUploadProgressPhoto(0);
        if (photoInputRef.current) photoInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center pt-6 sm:pt-12 px-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-zinc-100">Медиафайлы для авто</h1>
          <p className="text-sm text-zinc-500">
            Загрузите обложку или видео для выбранного автомобиля
          </p>
        </div>

        {!selectedCar ? (
          <div className="bg-[#141416] rounded-2xl border border-white/10 shadow-sm p-4 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Поиск по названию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 h-10 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-white/20 focus:border-zinc-400 text-zinc-100 bg-[#141416]"
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
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0">
                        {car.photoUrl ? (
                          <img src={car.photoUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Car className="w-5 h-5 text-zinc-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-zinc-100 truncate">{car.name}</div>
                        <div className="text-xs text-zinc-500">{car.year}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap justify-end pl-2">
                      {car.videoCoverUrl && (
                        <div className="bg-amber-500/150/20 text-amber-300 px-2 py-1 rounded text-[10px] font-bold shrink-0">
                          ЕСТЬ ОБЛОЖКА
                        </div>
                      )}
                      {car.videoUrl && (
                        <div className="bg-emerald-500/100/20 text-emerald-300 px-2 py-1 rounded text-[10px] font-bold shrink-0">
                          ЕСТЬ ВИДЕО
                        </div>
                      )}
                      <div className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center text-zinc-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4 opacity-0" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#141416] rounded-2xl border border-white/10 shadow-sm p-4 sm:p-6 space-y-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedCar(null)}
                className="text-sm text-blue-300 font-medium hover:underline flex-shrink-0"
              >
                ← Назад
              </button>
              <div className="font-semibold text-base sm:text-lg text-zinc-100 truncate">{selectedCar.name}</div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 text-rose-300 text-sm rounded-xl border border-rose-500/20">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Photo Upload Box */}
              {uploadSuccessPhoto ? (
                <div className="h-48 flex flex-col items-center justify-center text-amber-400 space-y-3 border-2 border-amber-400/20 bg-amber-500/15 rounded-2xl">
                  <div className="w-12 h-12 bg-amber-500/150/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-center text-sm">Обложка загружена!</p>
                </div>
              ) : (
                <label className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors h-48 flex flex-col justify-center ${
                  isUploadingPhoto ? "border-amber-400/40 bg-amber-500/15" : "border-white/10 hover:border-amber-400/60 hover:bg-white/[0.06]"
                }`}>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file, "photo");
                    }}
                    disabled={isUploadingPhoto || isUploadingVideo}
                  />
                  
                  <div className="flex flex-col items-center space-y-3">
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                        <div className="font-semibold text-amber-200 text-sm">Загрузка... {uploadProgressPhoto}%</div>
                        <div className="w-full max-w-xs h-1.5 bg-amber-500/150/20 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-600 transition-all duration-300" style={{ width: `${uploadProgressPhoto}%` }} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 bg-white/[0.08] rounded-full flex items-center justify-center text-zinc-500 mb-2">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div className="font-semibold text-zinc-100 px-4 text-sm">
                          {selectedCar.videoCoverUrl ? "Заменить обложку" : "Загрузить обложку"}
                        </div>
                        <div className="text-xs text-zinc-500">JPG/PNG</div>
                      </>
                    )}
                  </div>
                </label>
              )}

              {/* Video Upload Box */}
              {uploadSuccessVideo ? (
                <div className="h-48 flex flex-col items-center justify-center text-emerald-600 space-y-3 border-2 border-emerald-500/20 bg-emerald-500/10 rounded-2xl">
                  <div className="w-12 h-12 bg-emerald-500/100/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-center text-sm">Видео загружено!</p>
                </div>
              ) : (
                <label className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors h-48 flex flex-col justify-center ${
                  isUploadingVideo ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 hover:border-emerald-400/60 hover:bg-white/[0.06]"
                }`}>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file, "video");
                    }}
                    disabled={isUploadingVideo || isUploadingPhoto}
                  />
                  
                  <div className="flex flex-col items-center space-y-3">
                    {isUploadingVideo ? (
                      <>
                        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                        <div className="font-semibold text-emerald-900 text-sm">Загрузка... {uploadProgressVideo}%</div>
                        <div className="w-full max-w-xs h-1.5 bg-emerald-500/100/20 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-600 transition-all duration-300" style={{ width: `${uploadProgressVideo}%` }} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 bg-white/[0.08] rounded-full flex items-center justify-center text-zinc-500 mb-2">
                          <Video className="w-5 h-5" />
                        </div>
                        <div className="font-semibold text-zinc-100 px-4 text-sm">
                          {selectedCar.videoUrl ? "Заменить видео" : "Загрузить видео"}
                        </div>
                        <div className="text-xs text-zinc-500">До 1 ГБ, MP4/MOV</div>
                      </>
                    )}
                  </div>
                </label>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Fake Verification Toast */}
      <div 
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#141416] text-black px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 transition-all duration-500 z-50 ${
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
