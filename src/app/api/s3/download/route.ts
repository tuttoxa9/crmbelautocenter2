import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { verifyFirebaseIdToken } from "@/lib/verifyToken";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const token = searchParams.get("token");

    if (!key) {
      return NextResponse.json({ error: "No key provided" }, { status: 400 });
    }

    if (!token) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await verifyFirebaseIdToken(token);
    } catch (e) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Извлекаем оригинальное имя файла для скачивания (отрезаем префикс/папки и timestamp если есть)
    // Timestamp в формате 13 цифр_ (например 1712345678901_filename.jpg)
    const fileNameRaw = key.split('/').pop() || 'download';
    let downloadName = fileNameRaw;
    if (/^\d{13}_/.test(fileNameRaw)) {
        downloadName = fileNameRaw.substring(14);
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${downloadName}"`,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Перенаправляем на S3 со специальным заголовком Content-Disposition
    return NextResponse.redirect(signedUrl);

  } catch (error) {
    console.error("Error generating download url:", error);
    return NextResponse.json({ error: "Failed to download" }, { status: 500 });
  }
}
