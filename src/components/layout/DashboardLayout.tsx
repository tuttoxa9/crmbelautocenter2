"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Folder, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const navItems = [
  { name: "Лиды", href: "/leads", icon: ClipboardList },
  { name: "Файлы", href: "/files", icon: Folder },
  { name: "Настройки", href: "/settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
         <Spinner size="lg" />
      </div>
    );
  }

  // If not logged in and not on login page, children shouldn't really render much anyway
  // but AuthContext handles the redirect. Just to be safe we render children if not logged in
  // on the login page (handled by App logic, but DashboardLayout is only used for auth pages).

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <div className="flex h-screen bg-[#F4F5F7] overflow-hidden text-zinc-900">
      <Sidebar />

      {/* Mobile Sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#F9FAFB] text-zinc-900 shadow-2xl transition-transform duration-300">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Закрыть меню</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 h-0 pt-6 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-6">
                <h1 className="text-[15px] font-medium tracking-tight text-zinc-800">Белавтоцентр CRM</h1>
              </div>
              <nav className="mt-8 px-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "group flex items-center px-3 py-2.5 text-[14px] font-medium rounded-[8px] transition-all duration-300",
                        isActive ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50" : "text-zinc-500 hover:bg-zinc-100/60 hover:text-zinc-900 border border-transparent"
                      )}
                    >
                      <item.icon className="mr-4 h-5 w-5 stroke-[1.5]" aria-hidden="true" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-zinc-200/60 p-4 bg-zinc-50/50">
              <div className="flex items-center w-full justify-between">
                <div className="text-[13px] font-medium text-zinc-600 truncate pr-2">
                  {user?.email || "Пользователь"}
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-[6px]">
                  <LogOut className="h-5 w-5 stroke-[1.5]" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between bg-white border-b border-zinc-200/60 px-4 py-3 shadow-sm z-10">
          <h1 className="text-[15px] font-medium text-zinc-800 tracking-tight">Белавтоцентр CRM</h1>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="text-zinc-500 hover:text-zinc-900 focus:outline-none transition-colors"
          >
            <Menu className="h-6 w-6 stroke-[1.5]" />
          </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden bg-[#F4F5F7]">
          <div className="h-full w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
