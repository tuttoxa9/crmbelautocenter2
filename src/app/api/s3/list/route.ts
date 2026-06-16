import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { verifyFirebaseIdToken } from "@/lib/verifyToken";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix") || "";

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      Delimiter: "/",
    });

    const response = await s3Client.send(command);

    const folderDates = new Map<string, Date>();
    (response.Contents || []).forEach(c => {
      if (c.Key?.endsWith("/") && c.LastModified) {
        folderDates.set(c.Key, c.LastModified);
      }
    });

    const folders = (response.CommonPrefixes || []).map((p) => ({
      name: p.Prefix?.replace(prefix, "").replace("/", ""),
      path: p.Prefix,
      type: "folder",
      lastModified: folderDates.get(p.Prefix as string) || undefined,
    }));

    const files = (response.Contents || [])
      .filter((c) => c.Key !== prefix && !c.Key?.endsWith("/"))
      .map((c) => ({
        name: c.Key?.replace(prefix, ""),
        path: c.Key,
        size: c.Size,
        lastModified: c.LastModified,
        type: "file",
      }));

    return NextResponse.json({ items: [...folders, ...files] });
  } catch (error) {
    console.error("Error listing S3 objects:", error);
    return NextResponse.json({ error: "Failed to list objects" }, { status: 500 });
  }
}
