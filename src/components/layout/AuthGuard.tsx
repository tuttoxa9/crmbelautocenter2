"use client";

import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  // For development without Firebase keys, we will render children anyway
  // to allow testing the UI. In a real app we'd only return children if `user` is truthy.
  if (!auth) {
      return <>{children}</>;
  }

  // We only render children if we have a user (Dashboard routes)
  // For login route, we'll handle it separately in the page itself or layout
  return <>{user ? children : null}</>;
}
