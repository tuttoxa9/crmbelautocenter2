import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { verifyFirebaseIdToken } from "@/lib/verifyToken";
import { asciiFallbackName, fileLabel } from "@/lib/files/displayName";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") || searchParams.get("path");
    const authHeader = request.headers.get("Authorization");
    let token = searchParams.get("token");
    if (!token && authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length);
    }

    if (!key) {
      return NextResponse.json({ error: "No key provided" }, { status: 400 });
    }
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await verifyFirebaseIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const downloadName = fileLabel(key.split("/").pop() || "download");
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${asciiFallbackName(downloadName)}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return NextResponse.json({ url: signedUrl, downloadName });
  } catch (error) {
    console.error("Error generating download url:", error);
    return NextResponse.json({ error: "Failed to download" }, { status: 500 });
  }
}
