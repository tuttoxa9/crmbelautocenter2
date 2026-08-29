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
  board: (weekStart?: string) => qfetch(`/api/quality/board${weekStart ? `?weekStart=${weekStart}` : ""}`),
  people: () => qfetch("/api/quality/people"),
  createPerson: (body: object) => qfetch("/api/quality/people", { method: "POST", body: JSON.stringify(body) }),
  patchPerson: (uid: string, body: object) =>
    qfetch(`/api/quality/people/${uid}`, { method: "PATCH", body: JSON.stringify(body) }),
  deletePerson: (uid: string) => qfetch(`/api/quality/people/${uid}`, { method: "DELETE" }),
  week: (weekStart?: string) => qfetch(`/api/quality/week${weekStart ? `?weekStart=${weekStart}` : ""}`),
  saveWeek: (body: object) => qfetch("/api/quality/week", { method: "PUT", body: JSON.stringify(body) }),
  copyWeek: (from: string, to: string) =>
    qfetch("/api/quality/week", { method: "POST", body: JSON.stringify({ action: "copy", from, to }) }),
  organic: (body: object) => qfetch("/api/quality/organic", { method: "POST", body: JSON.stringify(body) }),
  shoot: (body: object) => qfetch("/api/quality/shoot", { method: "POST", body: JSON.stringify(body) }),
  addTask: (body: object) => qfetch("/api/quality/tasks", { method: "POST", body: JSON.stringify(body) }),
  patchTask: (body: object) => qfetch("/api/quality/tasks", { method: "PATCH", body: JSON.stringify(body) }),
  deleteTask: (id: string) => qfetch(`/api/quality/tasks?id=${id}`, { method: "DELETE" }),
  settings: () => qfetch("/api/quality/settings"),
  saveSettings: (body: object) => qfetch("/api/quality/settings", { method: "PUT", body: JSON.stringify(body) }),
  ig: (qs = "") => qfetch(`/api/quality/ig${qs}`),
  igPoll: () => qfetch("/api/quality/ig", { method: "POST", body: JSON.stringify({ action: "poll" }) }),
  igAssign: (mediaId: string, uid?: string) =>
    qfetch("/api/quality/ig", { method: "POST", body: JSON.stringify({ action: "assign", mediaId, uid }) }),
};
