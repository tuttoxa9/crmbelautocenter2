import { NextResponse } from "next/server";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { verifyFirebaseIdToken } from "@/lib/verifyToken";
import { safeFileName } from "@/lib/files/displayName";

async function keyExists(key: string) {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function splitName(name: string) {
  const dot = name.lastIndexOf(".");
  const hasExt = dot > 0 && name.length - dot <= 8;
  return hasExt ? { stem: name.slice(0, dot), ext: name.slice(dot) } : { stem: name, ext: "" };
}

async function uniqueKey(prefix: string, fileName: string) {
  const name = safeFileName(fileName);
  if (!(await keyExists(`${prefix}${name}`))) return `${prefix}${name}`;
  const { stem, ext } = splitName(name);
  for (let n = 2; n < 60; n++) {
    const candidate = `${stem} (${n})${ext}`;
    if (!(await keyExists(`${prefix}${candidate}`))) return `${prefix}${candidate}`;
  }
  return `${prefix}${stem} (${Date.now()})${ext}`;
}

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const prefix = (formData.get("prefix") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = await uniqueKey(prefix, file.name);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      }),
    );

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
