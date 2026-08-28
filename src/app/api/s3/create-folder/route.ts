import { NextResponse } from "next/server";
import { ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { verifyFirebaseIdToken } from "@/lib/verifyToken";
import { safeFileName } from "@/lib/files/displayName";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split("Bearer ")[1];

    try {
      await verifyFirebaseIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { prefix, folderName } = await request.json();
    if (!folderName || typeof folderName !== "string") {
      return NextResponse.json({ error: "No folder name provided" }, { status: 400 });
    }
    if (/[/\\]/.test(folderName)) {
      return NextResponse.json({ error: "Имя папки не должно содержать слэш" }, { status: 400 });
    }

    const name = safeFileName(folderName.trim());
    const key = `${prefix || ""}${name}/`;

    const existing = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: key,
        MaxKeys: 1,
      }),
    );
    if ((existing.Contents && existing.Contents.length > 0) || (existing.KeyCount && existing.KeyCount > 0)) {
      return NextResponse.json({ error: "Такая папка уже есть" }, { status: 409 });
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: "",
      }),
    );

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error("Error creating folder in S3:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
