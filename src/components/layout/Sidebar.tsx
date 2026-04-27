"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClipboardList, Folder, Settings, LogOut, Briefcase } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Лиды", href: "/leads", icon: ClipboardList, roles: ["admin"] },
  { name: "Комиссия", href: "/commission", icon: Briefcase, roles: ["admin", "commission"] },
  { name: "Файлы", href: "/files", icon: Folder, roles: ["admin"] },
];

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

  return (
    <div className="flex h-screen flex-col bg-zinc-950 border-r border-zinc-800 text-zinc-100 w-64 flex-shrink-0 hidden md:flex">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-lg font-semibold tracking-tight">Белавтоцентр CRM</h1>
      </div>
      
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.filter(item => item.roles.includes(userRole || 'admin')).map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-zinc-400 truncate pr-2">
            {user?.email || "Пользователь"}
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" title="Выйти">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
