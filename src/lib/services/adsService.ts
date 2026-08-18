import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  deleteDoc,
  onSnapshot,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { AdCar, AdCampaignType, AdPriceTier, AdsSettings } from "../types";

const AD_CARS_COLLECTION = "ad_cars";
const SETTINGS_COLLECTION = "settings";
const ADS_SETTINGS_DOC = "ads";

export const DEFAULT_ADS_SETTINGS: AdsSettings = {
  rk1Days: 17,
  rk2Days: 14,
  isActive: true,
};

export function calculatePriceTier(priceUsd: number): AdPriceTier {
  const price = Number(priceUsd) || 0;
  if (price < 7000) return 'tier_under_7k';
  if (price < 13000) return 'tier_7k_13k';
  if (price < 20000) return 'tier_13k_20k';
  return 'tier_20k_plus';
}

export function getPriceTierLabel(tier: AdPriceTier): string {
  switch (tier) {
    case 'tier_under_7k':
      return 'До $7 000';
    case 'tier_7k_13k':
      return '$7 000 – $13 000';
    case 'tier_13k_20k':
      return '$13 000 – $20 000';
    case 'tier_20k_plus':
      return '$20 000+';
    default:
      return 'Не указана';
  }
}

export function getCampaignLabel(campaign: AdCampaignType): string {
  switch (campaign) {
    case 'rk1':
      return 'РК 1';
    case 'rk2':
      return 'РК 2';
    case 'waiting_video':
      return 'Ожидает съёмки';
    default:
      return campaign;
  }
}

export function calculateDaysInAd(startedAt: number): number {
  if (!startedAt) return 0;
  const diffMs = Date.now() - startedAt;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export const subscribeToAdCars = (callback: (cars: AdCar[]) => void) => {
  if (!db) {
    console.error("Firestore is not initialized");
    callback([]);
    return () => {};
  }

  const carsRef = collection(db, AD_CARS_COLLECTION);
  const q = query(carsRef, orderBy("createdAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const cars = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as AdCar[];
      callback(cars);
    },
    (error) => {
      console.error("Error listening to ad cars:", error);
    }
  );

  return unsubscribe;
};

export const getAdCars = async (): Promise<AdCar[]> => {
  if (!db) return [];
  const carsRef = collection(db, AD_CARS_COLLECTION);
  const q = query(carsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as AdCar[];
};

export const createAdCar = async (
  carData: Omit<AdCar, "id" | "createdAt" | "updatedAt">
): Promise<AdCar> => {
  if (!db) throw new Error("Firestore is not initialized");

  const now = Date.now();
  const priceTier = carData.priceTier || calculatePriceTier(carData.priceUsd);

  const newCar: Omit<AdCar, "id"> = {
    ...carData,
    priceTier,
    startedAt: carData.campaign === 'waiting_video' ? now : (carData.startedAt || now),
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, AD_CARS_COLLECTION), newCar);
  return { id: docRef.id, ...newCar };
};

export const updateAdCar = async (
  id: string,
  updates: Partial<Omit<AdCar, "id" | "createdAt">>
) => {
  if (!db) throw new Error("Firestore is not initialized");

  const carRef = doc(db, AD_CARS_COLLECTION, id);
  const dataToUpdate: any = {
    ...updates,
    updatedAt: Date.now(),
  };

  if (updates.priceUsd !== undefined && !updates.priceTier) {
    dataToUpdate.priceTier = calculatePriceTier(updates.priceUsd);
  }

  await updateDoc(carRef, dataToUpdate);
};

export const switchAdCarCampaign = async (
  id: string,
  targetCampaign: AdCampaignType,
  customMaxDays?: number
) => {
  if (!db) throw new Error("Firestore is not initialized");

  const carRef = doc(db, AD_CARS_COLLECTION, id);
  const now = Date.now();

  const updateData: any = {
    campaign: targetCampaign,
    startedAt: now,
    updatedAt: now,
    lastAlertSentAt: null, // сбрасываем флаг алерта для новой кампании
  };

  if (customMaxDays !== undefined) {
    updateData.maxDays = customMaxDays;
  }

  await updateDoc(carRef, updateData);
};

export const resetAdCarTimer = async (id: string) => {
  if (!db) throw new Error("Firestore is not initialized");

  const carRef = doc(db, AD_CARS_COLLECTION, id);
  const now = Date.now();

  await updateDoc(carRef, {
    startedAt: now,
    updatedAt: now,
    lastAlertSentAt: null,
  });
};

export const deleteAdCar = async (id: string) => {
  if (!db) throw new Error("Firestore is not initialized");
  const carRef = doc(db, AD_CARS_COLLECTION, id);
  await deleteDoc(carRef);
};

export const getAdsSettings = async (): Promise<AdsSettings> => {
  if (!db) return DEFAULT_ADS_SETTINGS;

  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, ADS_SETTINGS_DOC);
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      return { ...DEFAULT_ADS_SETTINGS, ...snap.data() } as AdsSettings;
    }
  } catch (err) {
    console.error("Error fetching ads settings:", err);
  }

  return DEFAULT_ADS_SETTINGS;
};

export const updateAdsSettings = async (settings: Partial<AdsSettings>) => {
  if (!db) throw new Error("Firestore is not initialized");

  const settingsRef = doc(db, SETTINGS_COLLECTION, ADS_SETTINGS_DOC);
  await setDoc(
    settingsRef,
    {
      ...settings,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
};
