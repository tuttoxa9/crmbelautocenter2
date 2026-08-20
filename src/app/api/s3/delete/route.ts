import { NextResponse } from "next/server";
import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { verifyFirebaseIdToken } from "@/lib/verifyToken";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keys } = body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: "No keys provided" }, { status: 400 });
    }

    const authHeader = request.headers.get("Authorization");
    
    // Check if ALL keys to delete are inside the public SMM folder
    const allSmm = keys.every((k: string) => k.startsWith("videos/smm/"));

    if (!allSmm) {
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

    const results = await Promise.all(keys.map(async (key: string) => {
      if (key.endsWith('/')) {
        const listCommand = new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: key,
        });
        const listResponse = await s3Client.send(listCommand);
        return listResponse.Contents?.map(c => c.Key!).filter(Boolean) || [];
      }
      return [key];
    }));

    const allKeysToDelete = results.flat();

    if (allKeysToDelete.length === 0) {
       return NextResponse.json({ success: true, message: "Nothing to delete" });
    }

    const batchSize = 1000;
    for (let i = 0; i < allKeysToDelete.length; i += batchSize) {
        const batch = allKeysToDelete.slice(i, i + batchSize);
        const deleteCommand = new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: {
                Objects: batch.map(key => ({ Key: key })),
                Quiet: true,
            },
        });
        await s3Client.send(deleteCommand);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting from S3:", error);
    return NextResponse.json({ error: "Failed to delete files" }, { status: 500 });
  }
}
