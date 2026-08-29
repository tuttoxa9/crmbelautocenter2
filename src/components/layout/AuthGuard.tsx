"use client";

import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { Spinner } from "@/components/ui/spinner";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const COMMISSION_ALLOWED = ["/commission", "/ads", "/login"];
const SMM_ALLOWED = ["/goals", "/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (userRole === "commission") {
        const allowed = COMMISSION_ALLOWED.some((p) => pathname.startsWith(p));
        if (!allowed) router.push("/commission");
      }
      if (userRole === "smm") {
        const allowed = SMM_ALLOWED.some((p) => pathname.startsWith(p));
        if (!allowed) router.push("/goals");
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

  if (!auth) {
      return <>{children}</>;
  }

  return <>{user ? children : null}</>;
}
