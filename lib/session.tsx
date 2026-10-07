"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Session = { role: "admin" | "editor" | "general" | null; username: string | null; loaded: boolean };
const SessionContext = createContext<Session>({ role: null, username: null, loaded: false });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({ role: null, username: null, loaded: false });

  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then(r => r.ok ? r.json() : { role: null, username: null })
      .then(d => setSession({ role: d.role ?? null, username: d.username ?? null, loaded: true }))
      .catch(() => setSession(s => ({ ...s, loaded: true })));
  }, []);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
