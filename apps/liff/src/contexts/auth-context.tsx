"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { lineAuth, getMe, type Member } from "@/lib/api";

interface AuthContextValue {
  member: Member | null;
  loading: boolean;
  error: string | null;
  refreshMember: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  member: null,
  loading: true,
  error: null,
  refreshMember: async () => {},
  logout: () => {},
});

export function AuthProvider({
  children,
  accessToken,
}: {
  children: React.ReactNode;
  accessToken: string | null;
}) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshMember() {
    try {
      const { member: m } = await getMe();
      setMember(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load member");
    }
  }

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      setError("LINE access token unavailable");
      return;
    }

    (async () => {
      try {
        // Exchange LINE token → server JWT (stored in localStorage by lineAuth)
        await lineAuth(accessToken);
        await refreshMember();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Authentication failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  function logout() {
    localStorage.removeItem("tp_token");
    setMember(null);
  }

  return (
    <AuthContext.Provider value={{ member, loading, error, refreshMember, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
