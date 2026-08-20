import { NextResponse } from 'next/server';
import { sendTelegramAdRotationAlert } from '@/lib/telegram';

export async function POST() {
  try {
    await sendTelegramAdRotationAlert({
      name: "Тестовый автомобиль (Geely Tugella)",
      year: "2023",
      priceUsd: 26500,
      priceTierLabel: "$20 000+",
      currentCampaign: "rk1",
      targetCampaign: "rk2",
      daysInAd: 17,
    });

    return NextResponse.json({
      success: true,
      message: "Тестовое уведомление успешно отправлено в Telegram!",
    });
  } catch (error: any) {
    console.error("Error sending test telegram ad alert:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка отправки в Telegram" },
      { status: 500 }
    );
  }
}
