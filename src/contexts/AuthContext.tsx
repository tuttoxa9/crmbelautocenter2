"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userRole: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser && db) {
        if (currentUser.email && currentUser.email.toLowerCase() === "comis@belauto.by") {
          setUserRole('commission');
        } else {
          try {
            const docRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
               setUserRole(docSnap.data().role || 'admin');
            } else {
               setUserRole('admin');
            }
          } catch (error) {
            console.error("Error fetching user role: ", error);
            setUserRole('admin');
          }
        }
      } else {
        setUserRole(null);
      }
      
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
    } catch {
      // Ignore
    }

    if (!user && pathname !== "/login") {
      router.push("/login");
    } else if (user && (pathname === "/login" || pathname === "/")) {
      if (userRole === "commission") {
        router.push("/commission");
      } else {
        router.push("/leads");
      }
    }
  }, [user, userRole, loading, pathname, router]);

  // Temporary mock user for Playwright
  const [isBypass, setIsBypass] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem("PLAYWRIGHT_TEST_BYPASS") === "true") {
        setTimeout(() => setIsBypass(true), 0);
      }
    } catch {
      // Ignore
    }
  }, []);

  const mockUser = isBypass ? { email: "test@test.com", uid: "test_uid" } as User : null;

  return (
    <AuthContext.Provider value={{ user: user || mockUser, userRole: mockUser ? 'admin' : userRole, loading: isBypass ? false : loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
