import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
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
