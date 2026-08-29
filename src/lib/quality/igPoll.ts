import { adminDb } from "@/lib/firebaseAdmin";
import { getMinskDateKey } from "@/lib/services/adsService";
import { markersInCaption } from "./types";

const GRAPH = "https://graph.facebook.com/v21.0";

type GraphMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  timestamp?: string;
  permalink?: string;
  thumbnail_url?: string;
  media_url?: string;
};

async function graphList(path: string, token: string): Promise<GraphMedia[]> {
  const url = `${GRAPH}${path}${path.includes("?") ? "&" : "?"}fields=id,caption,media_type,timestamp,permalink,thumbnail_url,media_url&limit=50&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `Graph ${res.status}`);
  }
  return Array.isArray(json.data) ? json.data : [];
}

export async function pollInstagram() {
  const snap = await adminDb.collection("quality_settings").doc("main").get();
  const s = snap.data() || {};
  const token = String(s.igToken || "");
  const igUserId = String(s.igUserId || "");
  if (!token || !igUserId) {
    return { skipped: true, reason: "no-token" as const, count: 0 };
  }

  const peopleSnap = await adminDb.collection("users").where("role", "==", "smm").get();
  const byMarker = new Map<string, string>();
  peopleSnap.docs.forEach((d) => {
    const m = String(d.data()?.marker || "").toLowerCase();
    if (m && d.data()?.active !== false) byMarker.set(m, d.id);
  });

  const feed = await graphList(`/${igUserId}/media`, token);
  let stories: GraphMedia[] = [];
  try {
    stories = await graphList(`/${igUserId}/stories`, token);
  } catch {
    stories = [];
  }

  const items: { media: GraphMedia; source: "feed" | "stories" }[] = [
    ...feed.map((m) => ({ media: m, source: "feed" as const })),
    ...stories.map((m) => ({ media: m, source: "stories" as const })),
  ];

  let upserts = 0;
  for (const { media, source } of items) {
    const ts = media.timestamp ? Date.parse(media.timestamp) : Date.now();
    const dateKey = getMinskDateKey(Number.isFinite(ts) ? ts : Date.now());
    const caption = media.caption || "";
    const marks = markersInCaption(caption);
    let ownerUid: string | null = null;
    if (marks.length === 1 && byMarker.has(marks[0])) ownerUid = byMarker.get(marks[0]) || null;

    const ref = adminDb.collection("quality_ig_media").doc(media.id);
    const existing = await ref.get();
    const wasCredited = Boolean(existing.data()?.credited);

    const doc = {
      id: media.id,
      mediaType: media.media_type || "",
      caption,
      permalink: media.permalink || "",
      thumbnail: media.thumbnail_url || media.media_url || "",
      timestamp: media.timestamp || "",
      dateKey,
      source,
      ownerUid,
      updatedAt: Date.now(),
    };

    if (!existing.exists) {
      await ref.set({ ...doc, credited: false, createdAt: Date.now() });
      upserts += 1;
    } else {
      await ref.set({ ...doc }, { merge: true });
    }

    if (ownerUid && !wasCredited) {
      const kind =
        source === "stories"
          ? "stories"
          : String(media.media_type || "").toUpperCase() === "VIDEO" || String(media.media_type || "").toUpperCase() === "REELS"
            ? "reels"
            : "posts";
      const countRef = adminDb.collection("quality_counts").doc(`${ownerUid}_${dateKey}`);
      await adminDb.runTransaction(async (tx) => {
        const c = await tx.get(countRef);
        const cur = c.exists ? c.data() || {} : { uid: ownerUid, dateKey, stories: 0, reels: 0, posts: 0 };
        tx.set(
          countRef,
          { ...cur, uid: ownerUid, dateKey, [kind]: Number(cur[kind] || 0) + 1, updatedAt: Date.now() },
          { merge: true },
        );
      });
      await ref.set({ credited: true, ownerUid }, { merge: true });
    }
  }

  await adminDb.collection("quality_settings").doc("main").set(
    {
      lastPollAt: Date.now(),
      lastPollError: null,
      lastPollCount: items.length,
    },
    { merge: true },
  );

  return { skipped: false, count: items.length, upserts };
}
