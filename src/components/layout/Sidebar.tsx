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
    <aside
      className={cn(
        "group/rail fixed inset-y-0 left-0 z-30 hidden md:flex",
        "w-[72px] hover:w-[240px] focus-within:w-[240px]",
        "flex-col overflow-hidden border-r border-white/[0.06] bg-black text-zinc-100",
        "transition-[width] duration-150 ease-out motion-reduce:transition-none",
      )}
    >
      <div className="flex h-14 shrink-0 items-center px-4">
        <span className="min-w-0 truncate text-[13px] font-semibold tracking-tight text-zinc-100 opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
          Белавтоцентр
        </span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-1">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.name}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-[14px] text-[13px] font-medium transition-colors",
                isActive ? "bg-white/[0.08] text-white" : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100",
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

      <div className="flex h-14 shrink-0 items-center justify-center px-2 group-hover/rail:justify-start group-focus-within/rail:justify-start">
        <button
          type="button"
          onClick={() => void handleLogout()}
          title="Выйти"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/[0.06] hover:text-white"
        >
          <LogOut className="size-4" strokeWidth={1.5} />
        </button>
        <span className="ml-1 hidden min-w-0 flex-1 truncate text-[11px] text-zinc-500 group-hover/rail:block group-focus-within/rail:block">
          {user?.email || "Пользователь"}
        </span>
      </div>
    </aside>
  );
}
