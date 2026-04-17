import { NextResponse } from "next/server";
import { CopyObjectCommand, DeleteObjectCommand, ListObjectsV2Command, CopyObjectCommandInput } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { verifyFirebaseIdToken } from "@/lib/verifyToken";

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

    const { oldKey, newKey } = await request.json();
    if (!oldKey || !newKey) {
      return NextResponse.json({ error: "oldKey and newKey required" }, { status: 400 });
    }

    const isFolder = oldKey.endsWith("/");

    if (isFolder) {
      // For folders: list all objects, copy each, delete originals
      const listCommand = new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: oldKey });
      const listResponse = await s3Client.send(listCommand);
      const objects = listResponse.Contents || [];

      await Promise.all(objects.map(async (obj) => {
        if (!obj.Key) return;
        const newObjKey = obj.Key.replace(oldKey, newKey);
        const copyParams: CopyObjectCommandInput = {
          Bucket: BUCKET_NAME,
          CopySource: `${BUCKET_NAME}/${obj.Key}`,
          Key: newObjKey,
        };
        await s3Client.send(new CopyObjectCommand(copyParams));
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: obj.Key }));
      }));
    } else {
      // Single file rename
      const copyParams: CopyObjectCommandInput = {
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${oldKey}`,
        Key: newKey,
      };
      await s3Client.send(new CopyObjectCommand(copyParams));
      await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: oldKey }));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error renaming in S3:", error);
    return NextResponse.json({ error: "Failed to rename" }, { status: 500 });
  }
}
