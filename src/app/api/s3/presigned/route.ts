import { NextResponse } from "next/server";
import {
  GetBucketCorsCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { verifyFirebaseIdToken } from "@/lib/verifyToken";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { safeFileName } from "@/lib/files/displayName";

const ORIGINS = [
  "https://belautocenter.by",
  "https://www.belautocenter.by",
  "https://crm.belautocenter.by",
  "http://localhost:3000",
  "http://localhost:3001",
];

async function ensureCors() {
  const origins = new Set(ORIGINS);
  try {
    const current = await s3Client.send(new GetBucketCorsCommand({ Bucket: BUCKET_NAME }));
    for (const rule of current.CORSRules || []) {
      for (const origin of rule.AllowedOrigins || []) origins.add(origin);
    }
  } catch {
    /* empty */
  }
  await s3Client.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: [...origins],
            AllowedMethods: ["GET", "PUT", "HEAD", "POST"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag", "Content-Length"],
            MaxAgeSeconds: 86400,
          },
        ],
      },
    }),
  );
}

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

async function uniqueName(prefix: string, fileName: string) {
  const name = safeFileName(fileName);
  if (!(await keyExists(`${prefix}${name}`))) return name;
  const { stem, ext } = splitName(name);
  for (let n = 2; n < 60; n++) {
    const candidate = `${stem} (${n})${ext}`;
    if (!(await keyExists(`${prefix}${candidate}`))) return candidate;
  }
  return `${stem} (${Date.now()})${ext}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileName, contentType, prefix = "" } = body as {
      fileName?: string;
      contentType?: string;
      prefix?: string;
    };

    const authHeader = request.headers.get("Authorization");

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

    let prefixStr = (prefix || "").replace(/^\/+/, "").replace(/\\/g, "/");
    if (prefixStr && !prefixStr.endsWith("/")) prefixStr += "/";

    await ensureCors().catch(() => undefined);

    const name = await uniqueName(prefixStr, fileName);
    const key = `${prefixStr}${name}`;
    const ct = contentType || "application/octet-stream";
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: ct,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
      signableHeaders: new Set(["host", "content-type"]),
    });
    return NextResponse.json({ success: true, url, key, fileName: name });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 });
  }
}
