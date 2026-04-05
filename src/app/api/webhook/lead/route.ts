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

    // Parse mapping - standard fields
    const name = data.name || "Без имени";
    const phone = data.phone || "Нет телефона";
    const car = data.car || "";
    const source: LeadSource = data.source || "zapier";
    const status: LeadStatus = "new";
    const notes = data.notes || "Получено через API";

    const now = Date.now();

    // Create lead object using Firebase Admin SDK for robust authenticated writes
    const newLead = {
      name,
      phone,
      car,
      source,
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
          comment: "Лид создан через API (Zapier/Webhook)"
        }
      ],
      payload: data
    };

    const docRef = await adminDb.collection('leads').add(newLead);

    return NextResponse.json(
      { success: true, id: docRef.id, message: "Lead created successfully via Webhook" },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating lead via webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process lead data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
