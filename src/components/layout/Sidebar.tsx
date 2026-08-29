"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { user, userRole } = useAuth();

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const items = NAV_ITEMS.filter((item) => item.roles.includes(userRole || "admin"));

  return (
    <div className="pointer-events-none fixed inset-y-0 left-0 z-30 hidden w-[72px] bg-black md:block">
      <aside
        className={cn(
          "pointer-events-auto group/rail absolute inset-y-3 left-3 flex",
          "w-14 hover:w-[228px] focus-within:w-[228px]",
          "flex-col overflow-hidden rounded-[28px] bg-[#111113] text-zinc-100",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
          "transition-[width] duration-200 ease-out motion-reduce:transition-none",
        )}
      >
        <div className="flex h-12 shrink-0 items-center overflow-hidden px-4">
          <span className="whitespace-nowrap text-[13px] font-semibold tracking-tight text-zinc-100 opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
            Белавтоцентр
          </span>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto px-2 py-1">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.name}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-2xl px-2.5 text-[13px] font-medium transition-colors",
                  isActive ? "bg-white/[0.08] text-white" : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100",
                )}
              >
                <item.icon className="size-5 shrink-0" strokeWidth={1.5} />
                <span className="min-w-0 truncate whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex h-16 shrink-0 items-center overflow-hidden px-2 pb-2">
          <button
            type="button"
            onClick={() => void handleLogout()}
            title="Выйти"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-zinc-400 hover:bg-white/[0.06] hover:text-white"
          >
            <LogOut className="size-5" strokeWidth={1.5} />
          </button>
          <span className="ml-1 min-w-0 flex-1 truncate text-[11px] text-zinc-500 opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
            {user?.email || "Пользователь"}
          </span>
        </div>
      </aside>
    </div>
  );
}
