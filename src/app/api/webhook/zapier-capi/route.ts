import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, source, payload } = body;

    const zapierWebhookUrl = process.env.ZAPIER_CAPI_WEBHOOK_URL;
    if (!zapierWebhookUrl) {
      console.warn('ZAPIER_CAPI_WEBHOOK_URL is not set. Cannot send offline conversion.');
      return NextResponse.json({ success: false, message: 'Webhook URL not configured' }, { status: 200 });
    }

    // Ищем оригинальный ID лида в payload (мы настраивали это поле как lead_id в Zapier)
    const originalLeadId = payload?.lead_id || payload?.leadgen_id || payload?.ad_id;
    
    if (!originalLeadId) {
      console.warn(`No lead_id found in payload for CRM Lead ${leadId}`);
      return NextResponse.json({ success: false, message: 'No original lead_id to send' }, { status: 200 });
    }

    // Отправляем данные в Zapier (Catch Hook)
    const response = await fetch(zapierWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crm_lead_id: leadId,
        source: source,          // Это позволит тебе в Zapier разделить логику (если source === tiktok, то шли в TikTok Events API)
        lead_id: originalLeadId, // Тот самый заветный ID из рекламной площадки
        status: 'success',
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      console.error(`Zapier CAPI webhook returned status ${response.status}`);
      return NextResponse.json({ success: false, error: 'Zapier responded with error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Offline conversion event sent to Zapier' });
  } catch (err) {
    console.error('Error processing Zapier CAPI outbound webhook:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
