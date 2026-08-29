import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { pollInstagram } from "@/lib/quality/igPoll";

export async function GET(request: Request) {
  const isVercelCron = request.headers.get("x-vercel-cron") === "true";
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const ok = isVercelCron || (cronSecret && authHeader === `Bearer ${cronSecret}`);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await pollInstagram();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    await adminDb.collection("quality_settings").doc("main").set(
      { lastPollAt: Date.now(), lastPollError: err?.message || "ошибка Graph" },
      { merge: true },
    );
    return NextResponse.json({ success: false, error: err?.message || "poll failed" }, { status: 500 });
  }
}
