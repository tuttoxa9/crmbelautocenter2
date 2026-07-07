"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type CrmVersion = "v1" | "v2";

interface SettingsContextType {
  crmVersion: CrmVersion;
  setCrmVersion: (version: CrmVersion) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [crmVersion, setCrmVersionState] = useState<CrmVersion>("v1");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("crmVersion") as CrmVersion | null;
    if (saved === "v1" || saved === "v2") {
      setCrmVersionState(saved);
    }
  }, []);

  const setCrmVersion = (version: CrmVersion) => {
    setCrmVersionState(version);
    localStorage.setItem("crmVersion", version);
  };

  if (!mounted) {
    // Optionally return null or children directly to avoid hydration mismatch, 
    // but returning children might render v1 briefly before v2 is loaded.
    // We will just return children and let components handle it smoothly, or null if strict hydration is needed.
    return <>{children}</>;
  }

  return (
    <SettingsContext.Provider value={{ crmVersion, setCrmVersion }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
