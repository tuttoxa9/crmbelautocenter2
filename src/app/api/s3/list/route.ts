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

    return NextResponse.json({
      items: [...folders, ...files],
      truncated: Boolean(token),
    });
  } catch (error) {
    console.error("Error listing S3 objects:", error);
    return NextResponse.json({ error: "Failed to list objects" }, { status: 500 });
  }
}
