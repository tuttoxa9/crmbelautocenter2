"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading || !auth) return;

    // Temporary bypass for Playwright tests
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem("PLAYWRIGHT_TEST_BYPASS") === "true") {
         return;
      }
    } catch (e) {
      // Ignore
    }

    if (!user && pathname !== "/login") {
      router.push("/login");
    } else if (user && (pathname === "/login" || pathname === "/")) {
      router.push("/leads");
    }
  }, [user, loading, pathname, router]);

  // Temporary mock user for Playwright
  const [isBypass, setIsBypass] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem("PLAYWRIGHT_TEST_BYPASS") === "true") {
        setIsBypass(true);
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const mockUser = isBypass ? { email: "test@test.com", uid: "test_uid" } as User : null;

  return (
    <AuthContext.Provider value={{ user: user || mockUser, loading: isBypass ? false : loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
