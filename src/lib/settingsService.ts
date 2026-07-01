import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface TelegramSettings {
  botToken: string;
  chatId: string;
  isActive: boolean;
  reminderRules?: Record<string, number>;
  updatedAt?: number;
}

const SETTINGS_COLLECTION = "settings";
const TELEGRAM_DOCUMENT = "telegram";

export const DEFAULT_TELEGRAM_SETTINGS: TelegramSettings = {
  botToken: "7969988440:AAEqIdBJZVZJ-pco6otAJAkSv2XiTEsi1Z4",
  chatId: "-1002721193947",
  isActive: true,
  reminderRules: {
    callback: 10,  // Перезвонить за 10 минут
    visit: 30      // Приезд за 30 минут
  }
};

export const getTelegramSettings = async (): Promise<TelegramSettings> => {
  if (!db) return DEFAULT_TELEGRAM_SETTINGS;
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, TELEGRAM_DOCUMENT);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        botToken: data.botToken !== undefined ? data.botToken : DEFAULT_TELEGRAM_SETTINGS.botToken,
        chatId: data.chatId !== undefined ? data.chatId : DEFAULT_TELEGRAM_SETTINGS.chatId,
        isActive: data.isActive !== undefined ? data.isActive : DEFAULT_TELEGRAM_SETTINGS.isActive,
        reminderRules: data.reminderRules !== undefined ? data.reminderRules : DEFAULT_TELEGRAM_SETTINGS.reminderRules,
      };
    } else {
      // If it doesn't exist yet, we save default settings to Firestore so it is initialized
      try {
        await saveTelegramSettings(DEFAULT_TELEGRAM_SETTINGS);
      } catch (err) {
        console.warn("Could not auto-save default settings to Firestore, returning defaults.", err);
      }
    }
  } catch (error) {
    console.error("Error fetching telegram settings:", error);
  }
  return DEFAULT_TELEGRAM_SETTINGS;
};

export const saveTelegramSettings = async (settings: TelegramSettings): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized");
  const docRef = doc(db, SETTINGS_COLLECTION, TELEGRAM_DOCUMENT);
  await setDoc(docRef, {
    ...settings,
    updatedAt: Date.now()
  }, { merge: true });
};
