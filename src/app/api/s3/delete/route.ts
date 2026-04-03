import { NextResponse } from "next/server";
import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import * as admin from 'firebase-admin';

// Initialize firebase admin if not already
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "belauto-f2b93"
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split("Bearer ")[1];

    try {
        await admin.auth().verifyIdToken(idToken);
    } catch (e) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { keys } = await request.json();

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: "No keys provided" }, { status: 400 });
    }

    let allKeysToDelete: string[] = [];

    for (const key of keys) {
      if (key.endsWith('/')) {
        const listCommand = new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: key,
        });
        const listResponse = await s3Client.send(listCommand);
        if (listResponse.Contents) {
          allKeysToDelete.push(...listResponse.Contents.map(c => c.Key!).filter(Boolean));
        }
      } else {
        allKeysToDelete.push(key);
      }
    }

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
