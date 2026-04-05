import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { LeadSource, LeadStatus } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Authorization check - you can pass a secret token from Zapier
    const authHeader = request.headers.get('authorization');
    const secret = process.env.WEBHOOK_SECRET;

    // If a secret is configured, require it.
    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Enhanced source detection from payload text/tags if source field is missing or generic
    let detectedSource: LeadSource = data.source || "zapier";
    const payloadString = JSON.stringify(data).toLowerCase();

    if (detectedSource === "zapier" || detectedSource === "telegram") {
      if (payloadString.includes("instagram") || payloadString.includes("ig")) {
        detectedSource = "instagram";
      } else if (payloadString.includes("tiktok") || payloadString.includes("tik tok")) {
        detectedSource = "tiktok";
      } else if (payloadString.includes("site") || payloadString.includes("сайт") || payloadString.includes("web")) {
        detectedSource = "site";
      }
    }

    // Parse mapping - standard fields
    const name = data.name || "";
    const phone = data.phone || "";
    const car = data.car || "";
    const status: LeadStatus = "new";
    let notes = data.notes || "";
    if (notes.includes("Получено через API")) {
      notes = notes.replace("Получено через API", "").trim();
    }

    const now = Date.now();

    // Create lead object using Firebase Admin SDK
    const newLead = {
      name,
      phone,
      car,
      source: detectedSource,
      status,
      nextActionDate: null,
      notes,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          status,
          changedAt: now,
          changedBy: "API Webhook",
          comment: `${detectedSource === 'instagram' ? 'Instagram' : detectedSource === 'tiktok' ? 'TikTok' : detectedSource === 'site' ? 'Сайт' : detectedSource === 'telegram' ? 'Telegram' : 'Zapier'} Лид`
        }
      ],
      payload: data
    };

    if (!adminDb) {
      throw new Error("Firebase Admin is not initialized");
    }

    const docRef = await adminDb.collection('leads').add(newLead);

    return NextResponse.json(
      { success: true, id: docRef.id, message: "Lead created successfully via Webhook" },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating lead via webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process lead data' },
      { status: 500 }
    );
  }
}
