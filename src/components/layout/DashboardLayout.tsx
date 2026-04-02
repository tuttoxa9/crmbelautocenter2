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
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      {/* Mobile Sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-900 text-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold tracking-tight">Белавтоцентр CRM</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "group flex items-center px-2 py-2 text-base font-medium rounded-md",
                        isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      )}
                    >
                      <item.icon className="mr-4 h-6 w-6" aria-hidden="true" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-800 p-4">
              <div className="flex items-center w-full justify-between">
                <div className="text-sm font-medium text-gray-300 truncate">
                  {user?.email || "Пользователь"}
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-white hover:bg-gray-800">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between bg-gray-900 border-b border-gray-800 px-4 py-3">
          <h1 className="text-lg font-bold text-white tracking-tight">Белавтоцентр</h1>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="text-gray-300 hover:text-white focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
