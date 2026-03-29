"use client";

import { useEffect, useState } from "react";
import { initLiff, getLiffAccessToken } from "@/lib/liff";
import { AuthProvider } from "@/contexts/auth-context";

export default function LiffProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initLiff();
        const token = await getLiffAccessToken();
        setAccessToken(token);
      } catch (e) {
        setInitError(e instanceof Error ? e.message : "LIFF init failed");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-line-green border-t-transparent" />
          <p className="text-sm text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-700">เกิดข้อผิดพลาด</p>
          <p className="mt-1 text-sm text-red-500">{initError}</p>
        </div>
      </div>
    );
  }

  return <AuthProvider accessToken={accessToken}>{children}</AuthProvider>;
}
