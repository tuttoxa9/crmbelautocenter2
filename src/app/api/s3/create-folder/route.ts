import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
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

    const { prefix, folderName } = await request.json();

    if (!folderName) {
      return NextResponse.json({ error: "No folder name provided" }, { status: 400 });
    }

    const key = `${prefix || ""}${folderName}/`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: "",
    });

    await s3Client.send(command);

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error("Error creating folder in S3:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
