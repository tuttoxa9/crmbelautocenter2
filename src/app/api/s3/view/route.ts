import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BUCKET_NAME, s3Client } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") || searchParams.get("path");

  if (!key) {
    return NextResponse.json({ error: "Параметр key не указан" }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 86400 });

    return NextResponse.redirect(signedUrl, {
      status: 307,
      headers: {
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error generating view URL for key:", key, error);
    return NextResponse.json({ error: "Не удалось получить файл" }, { status: 500 });
  }
}
