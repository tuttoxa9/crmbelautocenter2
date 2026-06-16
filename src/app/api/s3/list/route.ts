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

    const contents = response.Contents || [];

    const folderObjects = contents.filter((c) => c.Key?.endsWith("/"));

    const folders = await Promise.all(
      (response.CommonPrefixes || []).map(async (p) => {
        let lastModified = folderObjects.find((c) => c.Key === p.Prefix)?.LastModified;

        if (!lastModified && p.Prefix) {
            try {
                const folderResponse = await s3Client.send(new ListObjectsV2Command({
                    Bucket: BUCKET_NAME,
                    Prefix: p.Prefix,
                    MaxKeys: 1,
                }));
                if (folderResponse.Contents && folderResponse.Contents.length > 0) {
                    lastModified = folderResponse.Contents[0].LastModified;
                }
            } catch (e) {
                console.error(`Failed to fetch last modified for prefix ${p.Prefix}:`, e);
            }
        }

        return {
          name: p.Prefix?.replace(prefix, "").replace("/", ""),
          path: p.Prefix,
          type: "folder",
          lastModified,
        };
      })
    );

    const files = contents
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
