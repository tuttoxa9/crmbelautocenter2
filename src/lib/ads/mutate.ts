import { campaignLabel } from "./copy";
import { getPriceTierLabel } from "@/lib/services/adsService";
import { sendTelegramAdShotAlert } from "@/lib/telegram";

export type HistoryKind = "add" | "shot" | "air" | "rotate" | "postpone" | "remove" | "reset" | "debt";

export type HistoryEntry = {
  at: number;
  kind: HistoryKind;
  from?: string;
  to?: string;
  by?: string;
};

export function appendHistory(data: Record<string, unknown>, entry: Omit<HistoryEntry, "at">) {
  const prev = Array.isArray(data.history) ? (data.history as HistoryEntry[]) : [];
  data.history = [...prev.slice(-29), { at: Date.now(), ...entry }];
}

export async function notifyShotAndStamp(data: Record<string, unknown>, fromCampaign?: string) {
  try {
    await sendTelegramAdShotAlert({
      name: String(data.name || "Авто"),
      year: data.year as string | number | undefined,
      priceUsd: Number(data.priceUsd) || 0,
      priceTierLabel: getPriceTierLabel(data.priceTier as never),
      fromCampaign,
      photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : undefined,
      shotByName: typeof data.shotByName === "string" ? data.shotByName : undefined,
    });
    data.shotNotifyStatus = "sent";
    data.shotNotifyError = undefined;
  } catch (err: any) {
    data.shotNotifyStatus = "failed";
    data.shotNotifyError = err?.message || "Telegram не принял";
  }
}

export function shotMessageFrom(fromCampaign?: string) {
  return campaignLabel(fromCampaign);
}
