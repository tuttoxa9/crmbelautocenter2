import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { LeadSource, LeadStatus, Integration } from '@/lib/types';
import crypto from 'crypto';

// Обязательная верификация для Meta Webhooks (challenge)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    console.log("Meta webhook verified successfully.");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('Incoming webhook data:', JSON.stringify(data, null, 2));

    const signature = request.headers.get('x-hub-signature-256');
    const tiktokSignature = request.headers.get('x-tiktok-signature');
    const authHeader = request.headers.get('authorization');

    let name = "";
    let phone = "";
    let car = "";
    let notes = "";
    let detectedSource: LeadSource = "zapier";
    let matchedIntegration: Integration | null = null;
    let payloadToStore: any = { ...data };

    // Подгрузка активных интеграций
    let integrations: Integration[] = [];
    if (adminDb) {
      try {
        const snapshot = await adminDb.collection('integrations').where('isActive', '==', true).get();
        integrations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Integration));
      } catch (err) {
        console.error('Error fetching integrations:', err);
      }
    }

    // 1. Обработка Meta Lead Ads нативно
    if (signature && data.object === 'page') {
      const appSecret = process.env.META_APP_SECRET;
      if (appSecret) {
        const expectedSignature = `sha256=${crypto
          .createHmac('sha256', appSecret)
          .update(rawBody)
          .digest('hex')}`;
        
        if (signature !== expectedSignature) {
          console.error('Meta signature mismatch');
          return NextResponse.json({ error: 'Invalid Meta signature' }, { status: 401 });
        }
      }

      detectedSource = "instagram"; // Или meta
      
      const changeValue = data.entry?.[0]?.changes?.[0]?.value;
      if (changeValue && changeValue.item === 'leadgen') {
        const leadgenId = changeValue.leadgen_id;
        const formId = changeValue.form_id;

        matchedIntegration = integrations.find(i => i.source === 'meta' && i.formId === formId) || null;

        if (process.env.META_SYSTEM_ACCESS_TOKEN) {
          try {
            const metaRes = await fetch(`https://graph.facebook.com/v19.0/${leadgenId}?access_token=${process.env.META_SYSTEM_ACCESS_TOKEN}`);
            const metaData = await metaRes.json();
            
            payloadToStore.graphData = metaData;
            
            const fieldData = metaData.field_data || [];
            for (const field of fieldData) {
              const fname = field.name.toLowerCase();
              if (fname.includes("name") || fname === "full_name" || fname === "first_name") name = field.values[0];
              if (fname.includes("phone")) phone = field.values[0];
              if (fname.includes("car") || fname.includes("vehicle") || fname.includes("авто")) car = field.values[0];
            }
          } catch (err) {
            console.error("Error fetching Graph API lead:", err);
          }
        } else {
          console.warn("META_SYSTEM_ACCESS_TOKEN is not set. Cannot fetch Meta lead details.");
          notes += " ВНИМАНИЕ: Нет токена Meta Graph API для получения деталей лида.";
        }
      }
    } 
    // 2. Обработка TikTok Lead Generation нативно
    else if (tiktokSignature || data?.tiktok_signature || (data?.form_id && !data.object)) {
      // Верификация подписи TikTok (примерная логика)
      const tiktokSecret = process.env.TIKTOK_SECRET;
      if (tiktokSecret && tiktokSignature) {
        const expectedSig = crypto.createHmac('sha256', tiktokSecret).update(rawBody).digest('hex');
        if (tiktokSignature !== expectedSig) {
          console.error("TikTok signature mismatch.");
          return NextResponse.json({ error: 'Invalid TikTok signature' }, { status: 401 });
        }
      }

      detectedSource = "tiktok";
      const formId = data.form_id;
      
      matchedIntegration = integrations.find(i => i.source === 'tiktok' && i.formId === formId) || null;

      // Парсинг ответов TikTok (зависит от структуры Webhook-а)
      // В TikTok чаще всего ответы могут приходить как data.answers или прямо как поля
      const formData = data.data || data.answers || [];
      if (Array.isArray(formData)) {
        for (const field of formData) {
           const key = field.key?.toLowerCase() || '';
           if (key.includes('name')) name = field.value;
           if (key.includes('phone') || key.includes('number')) phone = field.value;
           if (key.includes('car')) car = field.value;
        }
      }
    } 
    // 3. Обработка стандартного Zapier / Telegram Webhook
    else {
      const secret = process.env.WEBHOOK_SECRET;
      if (secret && authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      detectedSource = data.source || "zapier";
      const payloadString = JSON.stringify(data).toLowerCase();

      if (detectedSource === "zapier" || detectedSource === "telegram") {
        if (payloadString.includes("instagram") || payloadString.includes("ig")) {
          detectedSource = "instagram";
        } else if (payloadString.includes("tiktok") || payloadString.includes("tik tok")) {
          detectedSource = "tiktok";
        } else if (payloadString.includes("site") || payloadString.includes("сайт") || payloadString.includes("web")) {
          detectedSource = "site";
        } else if (payloadString.includes("kufar") || payloadString.includes("куфар")) {
          detectedSource = "kufar";
        }
      }

      name = data.name || "";
      phone = data.phone || "";
      car = data.car || "";
      notes = data.notes || "";
    }

    if (notes.includes("Получено через API")) {
      notes = notes.replace("Получено через API", "").trim();
    }

    // Если есть подходящая интеграция, добавляем ее в payload
    if (matchedIntegration) {
      payloadToStore.integration = matchedIntegration;
      if (matchedIntegration.notes) {
        notes = notes ? `${notes}\n[Интеграция: ${matchedIntegration.name}]` : `[Интеграция: ${matchedIntegration.name}]`;
      }
    }

    const status: LeadStatus = "new";
    const now = Date.now();

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
          comment: `Нативный webhook (${detectedSource})`
        }
      ],
      payload: payloadToStore
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
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process lead data' },
      { status: 500 }
    );
  }
}
