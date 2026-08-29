"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "./Sidebar";
import { Spinner } from "@/components/ui/spinner";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, userRole, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const items = NAV_ITEMS.filter((item) => item.roles.includes(userRole || "admin"));
  const current = items.find((i) => pathname.startsWith(i.href))?.name || "Белавтоцентр";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-black text-zinc-100">
      <Sidebar />

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex h-full w-[80vw] max-w-xs flex-col bg-black text-zinc-100 ring-1 ring-white/10">
            <div className="flex items-center justify-between px-5 pt-6 pb-4">
              <p className="text-sm font-semibold tracking-tight">Белавтоцентр</p>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex size-10 items-center justify-center rounded-full text-zinc-400 hover:text-white"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
              {items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium",
                      isActive ? "bg-white/[0.08] text-white" : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100",
                    )}
                  >
                    <item.icon className="size-5" strokeWidth={1.5} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-4">
              <span className="truncate text-sm text-zinc-500">{user?.email || "Пользователь"}</span>
              <button type="button" onClick={() => void handleLogout()} className="flex size-10 items-center justify-center rounded-xl text-zinc-400 hover:text-white">
                <LogOut className="size-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden md:pl-[72px]">
        <div className="flex items-center justify-between border-b border-white/10 bg-black px-4 py-3 md:hidden">
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">{current}</h1>
          <button type="button" onClick={() => setMobileMenuOpen(true)} className="text-zinc-400 hover:text-zinc-100">
            <Menu className="size-6" strokeWidth={1.5} />
          </button>
        </div>
        <main className="min-h-0 flex-1 overflow-hidden bg-black">
          <div className="h-full w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
