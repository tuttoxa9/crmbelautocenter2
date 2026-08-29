"use client";

import { useRef } from "react";
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
  const leaveTimer = useRef<number | null>(null);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const items = NAV_ITEMS.filter((item) => item.roles.includes(userRole || "admin"));
  const initial = (user?.email || "Б").slice(0, 1).toUpperCase();

  const onEnter = () => {
    if (leaveTimer.current) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  };

  return (
    <aside
      onMouseEnter={onEnter}
      onMouseLeave={() => {
        /* collapse via CSS group */
      }}
      className="group/rail pointer-events-none fixed top-2 bottom-2 left-2 z-30 hidden md:block"
    >
      <div
        className={cn(
          "pointer-events-auto flex h-full w-[72px] flex-col overflow-hidden rounded-3xl bg-[#070708] text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,.55)] ring-1 ring-white/10",
          "transition-[width] duration-150 ease-out motion-reduce:transition-none",
          "hover:w-[240px] focus-within:w-[240px]",
        )}
      >
        <div className="flex h-[72px] shrink-0 items-center gap-3 px-[16px]">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-black">
            Б
          </span>
          <span className="min-w-0 truncate text-sm font-semibold tracking-tight opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
            Белавтоцентр
          </span>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.name}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-2xl px-[10px] text-[13px] font-medium transition-colors",
                  isActive ? "bg-[#141416] text-white" : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100",
                )}
              >
                <item.icon className="size-5 shrink-0" strokeWidth={1.5} />
                <span className="min-w-0 truncate opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex h-[64px] shrink-0 items-center gap-2 px-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-medium">
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-500 opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
            {user?.email || "Пользователь"}
          </span>
          <button
            type="button"
            onClick={() => void handleLogout()}
            title="Выйти"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 hover:bg-white/[0.06] hover:text-white"
          >
            <LogOut className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}
