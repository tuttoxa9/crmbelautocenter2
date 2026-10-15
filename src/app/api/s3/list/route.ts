import { NextResponse } from "next/server";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { verifyFirebaseIdToken } from "@/lib/verifyToken";
import { isImageName } from "@/lib/files/displayName";

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

    const folders: Array<{
      name: string;
      path: string;
      type: "folder";
      lastModified?: Date;
    }> = [];
    const files: Array<{
      name: string;
      path: string;
      type: "file";
      size?: number;
      lastModified?: Date;
      url?: string;
    }> = [];

    let token: string | undefined;
    let pages = 0;
    do {
      const response = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: prefix,
          Delimiter: "/",
          ContinuationToken: token,
        }),
      );
      pages += 1;

      const contents = response.Contents || [];
      const folderMarkers = new Map(
        contents.filter((c) => c.Key?.endsWith("/")).map((c) => [c.Key, c.LastModified]),
      );

      for (const p of response.CommonPrefixes || []) {
        folders.push({
          name: p.Prefix?.replace(prefix, "").replace(/\/$/, "") || "",
          path: p.Prefix || "",
          type: "folder",
          lastModified: folderMarkers.get(p.Prefix),
        });
      }

      for (const c of contents) {
        if (!c.Key || c.Key === prefix || c.Key.endsWith("/")) continue;
        files.push({
          name: c.Key.replace(prefix, ""),
          path: c.Key,
          size: c.Size,
          lastModified: c.LastModified,
          type: "file",
        });
      }

      token = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (token && pages < 20);

    const missing = folders.filter((f) => !f.lastModified && f.path);
    if (missing.length > 0) {
      let cursor = 0;
      const worker = async () => {
        while (cursor < missing.length) {
          const index = cursor++;
          const f = missing[index];
          try {
            const folderResponse = await s3Client.send(
              new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                Prefix: f.path,
                MaxKeys: 1,
              }),
            );
            f.lastModified = folderResponse.Contents?.[0]?.LastModified;
          } catch {
            /* ignore date fetch failure */
          }
        }
      };

      const concurrency = Math.min(15, missing.length);
      await Promise.race([
        Promise.all(Array.from({ length: concurrency }, worker)),
        new Promise((resolve) => setTimeout(resolve, 8000)),
      ]);
    }

    // Для изображений генерируем presigned URL в памяти через HMAC (на 24 часа)
    await Promise.all(
      files.map(async (file) => {
        if (isImageName(file.name)) {
          try {
            file.url = await getSignedUrl(
              s3Client,
              new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: file.path,
              }),
              { expiresIn: 86400 },
            );
          } catch {
            /* ignore presigning error */
          }
        }
      }),
    );

    return NextResponse.json({
      items: [...folders, ...files],
      truncated: Boolean(token),
    });
  } catch (error) {
    console.error("Error listing S3 objects:", error);
    return NextResponse.json({ error: "Failed to list objects" }, { status: 500 });
  }
}
