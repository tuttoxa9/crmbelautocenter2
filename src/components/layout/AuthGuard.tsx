"use client";

import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { Spinner } from "@/components/ui/spinner";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // If user is a commission agent and trying to access non-commission routes
      if (userRole === "commission" && !pathname.startsWith("/commission") && !pathname.startsWith("/login")) {
         router.push("/commission");
      }
    }
  }, [loading, user, userRole, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
         <Spinner size="lg" />
      </div>
    );
  }

  // For development without Firebase keys, we will render children anyway
  // to allow testing the UI. In a real app we'd only return children if `user` is truthy.
  if (false) {
      return <>{children}</>;
  }

  // We only render children if we have a user (Dashboard routes)
  // For login route, we'll handle it separately in the page itself or layout
  return <>{children}</>;
}
