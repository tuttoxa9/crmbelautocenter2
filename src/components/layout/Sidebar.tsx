"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClipboardList, Folder, Settings, LogOut, Menu } from "lucide-react";
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
    <div className="flex h-screen flex-col bg-gray-900 text-white w-64 flex-shrink-0 hidden md:flex">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight">Белавтоцентр CRM</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-300 truncate pr-2">
            {user?.email || "Пользователь"}
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-white hover:bg-gray-800" title="Выйти">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
