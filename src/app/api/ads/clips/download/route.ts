import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { sql } from "@/lib/db";
import { verifyFirebaseIdToken } from "@/lib/verifyToken";
import { asciiFallbackName } from "@/lib/files/displayName";
import { clipFileName, isAllowedClipKey, keyFromVideoUrl, loadSiteAdClips } from "@/lib/ads/clips";

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

async function tokenOf(request: Request) {
  const header = request.headers.get("Authorization") || "";
  const url = new URL(request.url);
  const token = header.startsWith("Bearer ") ? header.slice(7) : url.searchParams.get("token") || "";
  if (!token) throw new Error("unauthorized");
  await verifyFirebaseIdToken(token);
}

export async function GET(request: Request) {
  try {
    try {
      await tokenOf(request);
    } catch {
      return NextResponse.json({ error: "Войдите в CRM" }, { status: 401 });
    }

    const url = new URL(request.url);
    const carId = String(url.searchParams.get("carId") || "").trim();
    const clipId = String(url.searchParams.get("clipId") || "").trim();
    if (!carId || !clipId) return NextResponse.json({ error: "Нет ролика" }, { status: 400 });

    const site = await loadSiteAdClips([carId]);
    const hit = site.get(carId);
    const clip = hit?.clips.find((item) => item.id === clipId);
    let key = clip?.key || "";
    let name = clipFileName(hit?.name || "ролик", hit?.year, Math.max(0, (hit?.clips || []).findIndex((item) => item.id === clipId)));

    if (!key && clipId === "legacy") {
      const ads = await sql`SELECT data FROM ad_cars`;
      for (const row of ads) {
        const data = asRecord(row.data);
        if (String(data.carId || "") !== carId) continue;
        const videoUrl = String(data.videoUrl || "");
        key = keyFromVideoUrl(videoUrl);
        name = clipFileName(String(data.name || hit?.name || "ролик"), data.year as string | number | undefined, 0);
        if (!key && /^https?:\/\//i.test(videoUrl)) {
          return NextResponse.json({ url: videoUrl, downloadName: name });
        }
        break;
      }
    }

    if (!key || !isAllowedClipKey(key)) {
      return NextResponse.json({ error: "Файла уже нет" }, { status: 404 });
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${asciiFallbackName(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    });
    const signed = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return NextResponse.json({ url: signed, downloadName: name });
  } catch (error) {
    console.error("ads clip download", error);
    return NextResponse.json({ error: "Не скачалось, ещё раз" }, { status: 500 });
  }
}
