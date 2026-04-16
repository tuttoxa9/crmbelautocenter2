"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClipboardList, Folder, Settings, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Лиды", href: "/leads", icon: ClipboardList },
  { name: "Файлы", href: "/files", icon: Folder },
  { name: "Настройки", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#F9FAFB] border-r border-zinc-200/60 text-zinc-900 w-[260px] flex-shrink-0 hidden md:flex">
      <div className="px-6 py-8">
        <h1 className="text-[15px] font-medium tracking-tight text-zinc-800">Белавтоцентр CRM</h1>
      </div>
      
      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[8px] px-3 py-2 text-[14px] font-medium transition-all duration-300 ease-out",
                isActive ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50" : "text-zinc-500 hover:bg-zinc-100/60 hover:text-zinc-900 border border-transparent"
              )}
            >
              <item.icon className="h-4 w-4 stroke-[1.5]" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto mb-2 mx-4 bg-zinc-100/50 rounded-[10px] border border-zinc-200/50">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-medium text-zinc-600 truncate pr-2">
            {user?.email || "Пользователь"}
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-[6px]" title="Выйти">
            <LogOut className="h-4 w-4 stroke-[1.5]" />
          </Button>
        </div>
      </div>
    </div>
  );
}
