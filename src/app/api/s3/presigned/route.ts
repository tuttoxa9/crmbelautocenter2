import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { verifyFirebaseIdToken } from "@/lib/verifyToken";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileName, contentType, prefix = "" } = body;

    const authHeader = request.headers.get("Authorization");
    
    // Allow anonymous uploads ONLY for the SMM folder
    if (prefix !== "videos/smm/") {
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const idToken = authHeader.split("Bearer ")[1];

      try {
        await verifyFirebaseIdToken(idToken);
      } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    }

    if (!fileName) {
      return NextResponse.json({ error: "No fileName provided" }, { status: 400 });
    }

    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const key = `${prefix}${timestamp}_${cleanFileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType || "video/mp4",
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ success: true, url, key });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 });
  }
}
