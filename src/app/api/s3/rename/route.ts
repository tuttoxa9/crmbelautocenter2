import { NextResponse } from "next/server";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  type CopyObjectCommandInput,
} from "@aws-sdk/client-s3";
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
    if (oldKey === newKey) {
      return NextResponse.json({ success: true });
    }
    if (typeof newKey !== "string" || newKey.includes("..")) {
      return NextResponse.json({ error: "Некорректное имя" }, { status: 400 });
    }

    const isFolder = oldKey.endsWith("/");
    const copied: string[] = [];
    const failedDeletes: string[] = [];

    if (isFolder) {
      let token: string | undefined;
      const objects: string[] = [];
      do {
        const listResponse = await s3Client.send(
          new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: oldKey, ContinuationToken: token }),
        );
        for (const obj of listResponse.Contents || []) {
          if (obj.Key) objects.push(obj.Key);
        }
        token = listResponse.IsTruncated ? listResponse.NextContinuationToken : undefined;
      } while (token);

      for (const objKey of objects) {
        const newObjKey = objKey.replace(oldKey, newKey);
        const copyParams: CopyObjectCommandInput = {
          Bucket: BUCKET_NAME,
          CopySource: `${BUCKET_NAME}/${encodeURIComponent(objKey).replace(/%2F/g, "/")}`,
          Key: newObjKey,
        };
        await s3Client.send(new CopyObjectCommand(copyParams));
        copied.push(objKey);
        try {
          await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: objKey }));
        } catch {
          failedDeletes.push(objKey);
        }
      }
    } else {
      const copyParams: CopyObjectCommandInput = {
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${encodeURIComponent(oldKey).replace(/%2F/g, "/")}`,
        Key: newKey,
      };
      await s3Client.send(new CopyObjectCommand(copyParams));
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: oldKey }));
      } catch {
        failedDeletes.push(oldKey);
      }
    }

    if (failedDeletes.length > 0) {
      return NextResponse.json({
        success: true,
        warning: "Файл на месте под новым именем, старый тоже мог остаться — обновите список",
      });
    }

    return NextResponse.json({ success: true, copied: copied.length });
  } catch (error) {
    console.error("Error renaming in S3:", error);
    return NextResponse.json({ error: "Failed to rename" }, { status: 500 });
  }
}
