"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  if (user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (!auth) {
      setError("Система авторизации не настроена.");
      setLoading(false);
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      setError("Неверный email или пароль.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-[24px] bg-[#141416] p-8 shadow-[0_24px_80px_rgba(0,0,0,.6)] ring-1 ring-white/10">
        <p className="text-center text-xl font-semibold tracking-tight text-zinc-100">Белавтоцентр</p>
        <p className="mt-1 text-center text-sm text-zinc-500">Вход для сотрудников</p>
        {error ? (
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
            <AlertCircle className="size-4 shrink-0" strokeWidth={1.5} />
            {error}
          </div>
        ) : null}
        <label className="mt-6 block text-xs font-medium text-zinc-500">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1.5 h-11 w-full rounded-xl bg-black/40 px-3 text-sm text-zinc-100 outline-none ring-1 ring-white/10 focus:ring-white/25"
        />
        <label className="mt-4 block text-xs font-medium text-zinc-500">Пароль</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1.5 h-11 w-full rounded-xl bg-black/40 px-3 text-sm text-zinc-100 outline-none ring-1 ring-white/10 focus:ring-white/25"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-black disabled:opacity-40"
        >
          {loading ? <Spinner size="sm" /> : null}
          {loading ? "Вход…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
