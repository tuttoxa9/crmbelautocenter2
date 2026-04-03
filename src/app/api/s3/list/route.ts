import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
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

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix") || "";

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      Delimiter: "/",
    });

    const response = await s3Client.send(command);

    const folders = (response.CommonPrefixes || []).map((p) => ({
      name: p.Prefix?.replace(prefix, "").replace("/", ""),
      path: p.Prefix,
      type: "folder",
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
