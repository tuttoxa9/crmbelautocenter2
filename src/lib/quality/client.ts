import { auth } from "@/lib/firebase";

async function token() {
  const user = auth?.currentUser;
  if (!user) throw new Error("Нужен вход");
  return user.getIdToken();
}

async function qfetch(url: string, init?: RequestInit) {
  const t = await token();
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${t}`,
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Ошибка");
  }
  return data;
}

export const qualityApi = {
  board: () => qfetch("/api/quality/board"),
  people: () => qfetch("/api/quality/people"),
  createPerson: (body: object) => qfetch("/api/quality/people", { method: "POST", body: JSON.stringify(body) }),
  patchPerson: (uid: string, body: object) =>
    qfetch(`/api/quality/people/${uid}`, { method: "PATCH", body: JSON.stringify(body) }),
  week: (weekStart?: string) => qfetch(`/api/quality/week${weekStart ? `?weekStart=${weekStart}` : ""}`),
  saveWeek: (body: object) => qfetch("/api/quality/week", { method: "PUT", body: JSON.stringify(body) }),
  organic: (body: object) => qfetch("/api/quality/organic", { method: "POST", body: JSON.stringify(body) }),
  shoot: (body: object) => qfetch("/api/quality/shoot", { method: "POST", body: JSON.stringify(body) }),
};
