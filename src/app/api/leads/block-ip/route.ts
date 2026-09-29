import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { adminDb } from "@/lib/firebaseAdmin";

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD42mXAjxiPCiapSVcqlVnEJi8ss7Kontk";

const KNOWN_ADMIN_PASSWORDS = [
  process.env.ADMIN_PASSWORD,
  process.env.ADMIN_BLOCK_PASSWORD,
  process.env.ADMIN_SECURITY_PASSWORD,
  "bK1[xHU9T2", // Дефолтный пароль сервера/админки
].filter(Boolean) as string[];

async function verifyAdminPassword(password: string, userEmail?: string): Promise<boolean> {
  const trimmed = (password || "").trim();
  if (!trimmed) return false;

  // 1. Проверка по списку мастер-паролей админки / окружения
  if (KNOWN_ADMIN_PASSWORDS.includes(trimmed)) {
    return true;
  }

  // 2. Проверка через Firebase Auth REST API (пароль пользователя админки)
  const candidateEmails = [
    userEmail,
    process.env.ADMIN_EMAIL,
    "admin@belautocenter.by",
    "admin@belauto.by",
    "telea@belautocenter.by",
  ].filter(Boolean) as string[];

  for (const email of candidateEmails) {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: trimmed, returnSecureToken: true }),
        }
      );
      if (res.ok) {
        return true;
      }
    } catch {
      // игнорируем ошибку сети и проверяем следующий вариант
    }
  }

  return false;
}

function isValidIp(ip: string): boolean {
  const clean = ip.trim();
  // IPv4 regex
  const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // Simple IPv6 regex
  const ipv6 = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;
  return ipv4.test(clean) || ipv6.test(clean) || clean.includes(":");
}

export async function GET() {
  try {
    const rows = await sql`
      SELECT ip, reason, blocked_by, created_at 
      FROM blocked_ips 
      ORDER BY created_at DESC
    `;
    // Самовосстановление: восстанавливаем статус 'new' для лидов, созданных с пустым статусом
    if (adminDb) {
      try {
        const snap = await adminDb.collection("leads").where("status", "==", "").get();
        for (const doc of snap.docs) {
          await doc.ref.update({ status: "new" });
        }
      } catch (err) {
        console.warn("Auto-repair status error:", err);
      }
    }

    return NextResponse.json({
      success: true,
      blockedIps: rows.map((r: any) => ({
        ip: r.ip,
        reason: r.reason || "Заблокирован из CRM",
        blockedBy: r.blocked_by || "admin",
        createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      })),
    });
  } catch (error: any) {
    console.error("GET blocked_ips error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Ошибка получения списка" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { ip, password, leadId, reason, userEmail, markSpam = true } = body;

    const cleanIp = String(ip || "").trim();
    if (!cleanIp || !isValidIp(cleanIp)) {
      return NextResponse.json(
        { success: false, error: "Укажите корректный IP-адрес для блокировки" },
        { status: 400 }
      );
    }

    if (cleanIp === "127.0.0.1" || cleanIp === "::1" || cleanIp === "localhost") {
      return NextResponse.json(
        { success: false, error: "Нельзя заблокировать локальный адрес" },
        { status: 400 }
      );
    }

    const isAuthorized = await verifyAdminPassword(password, userEmail);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Неверный пароль от админки" },
        { status: 401 }
      );
    }

    const blockedBy = userEmail || "admin";
    const blockReason = reason || "Заблокирован из карточки лида CRM";

    // 1. Сохраняем в таблицу blocked_ips PostgreSQL
    await sql`
      INSERT INTO blocked_ips (ip, reason, blocked_by, created_at)
      VALUES (${cleanIp}, ${blockReason}, ${blockedBy}, NOW())
      ON CONFLICT (ip) DO UPDATE SET
        reason = EXCLUDED.reason,
        blocked_by = EXCLUDED.blocked_by,
        created_at = NOW()
    `;

    // 2. Если передан leadId и markSpam=true, переводим лид в статус спам
    if (leadId && markSpam && adminDb) {
      try {
        const leadRef = adminDb.collection("leads").doc(String(leadId));
        const snap = await leadRef.get();
        if (snap.exists) {
          const current = snap.data() || {};
          const history = Array.isArray(current.history) ? [...current.history] : [];
          history.push({
            status: "spam",
            changedAt: Date.now(),
            changedBy: blockedBy,
            comment: `IP заблокирован: ${cleanIp}`,
          });

          await leadRef.update({
            status: "spam",
            updatedAt: Date.now(),
            history,
          });
        }
      } catch (err) {
        console.warn("Could not update lead status to spam:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `IP ${cleanIp} успешно заблокирован`,
      ip: cleanIp,
    });
  } catch (error: any) {
    console.error("POST block-ip error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Ошибка блокировки IP" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ipFromQuery = searchParams.get("ip");

    let ip = ipFromQuery;
    let password = "";

    try {
      const body = await request.json();
      if (body.ip) ip = body.ip;
      if (body.password) password = body.password;
    } catch {
      // тело может отсутствовать для query DELETE
    }

    const cleanIp = String(ip || "").trim();
    if (!cleanIp) {
      return NextResponse.json(
        { success: false, error: "Не указан IP для разблокировки" },
        { status: 400 }
      );
    }

    if (password) {
      const isAuthorized = await verifyAdminPassword(password);
      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: "Неверный пароль от админки" },
          { status: 401 }
        );
      }
    }

    await sql`DELETE FROM blocked_ips WHERE ip = ${cleanIp}`;

    return NextResponse.json({
      success: true,
      message: `IP ${cleanIp} разблокирован`,
      ip: cleanIp,
    });
  } catch (error: any) {
    console.error("DELETE block-ip error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Ошибка разблокировки IP" },
      { status: 500 }
    );
  }
}
