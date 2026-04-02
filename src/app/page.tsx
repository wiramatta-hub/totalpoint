"use client";

import { useEffect, useState, useCallback } from "react";
import Pusher from "pusher-js";
import { TIER_CONFIG } from "@/lib/tiers";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  line_uid: string;
  display_name: string;
  current_points: number;
  total_spent: number;
  tier: string;
}

interface Reward {
  id: string;
  title: string;
  required_points: number;
  image_url: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  points_earned_or_burned: number;
  type: string;
  description: string | null;
  created_at: string;
}

type AppState = "loading" | "ready" | "error";
type Tab = "rewards" | "history";

// ─── Tier helpers ─────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  Member: "from-zinc-400 to-zinc-600",
  Silver: "from-slate-400 to-slate-600",
  Gold:   "from-yellow-400 to-amber-600",
  VIP:    "from-purple-500 to-indigo-700",
};

const TIER_BADGE: Record<string, string> = {
  Member: "bg-zinc-500",
  Silver: "bg-slate-500",
  Gold:   "bg-yellow-500",
  VIP:    "bg-purple-600",
};

function getNextTier(currentTier: string) {
  const idx = TIER_CONFIG.findIndex((t) => t.label === currentTier);
  return idx < TIER_CONFIG.length - 1 ? TIER_CONFIG[idx + 1] : null;
}

function tierProgress(totalSpent: number, currentTier: string): number {
  const next = getNextTier(currentTier);
  if (!next) return 100;
  const current = TIER_CONFIG.find((t) => t.label === currentTier)!;
  const range = next.minSpent - current.minSpent;
  const progress = totalSpent - current.minSpent;
  return Math.min(100, Math.floor((progress / range) * 100));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("rewards");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Fetch transaction history ───────────────────────────────────────────────
  const fetchHistory = useCallback(async (lineUid: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/transactions?line_uid=${encodeURIComponent(lineUid)}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions ?? []);
      }
    } catch {
      console.error("Failed to fetch history");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // ── LIFF init & data fetch ──────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        // Dynamically import LIFF to avoid SSR issues
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        const { line_uid, display_name } = {
          line_uid: profile.userId,
          display_name: profile.displayName,
        };

        // Register / fetch user from DB
        const res = await fetch(
          `/api/user?line_uid=${encodeURIComponent(line_uid)}&display_name=${encodeURIComponent(display_name)}`
        );
        if (!res.ok) throw new Error("Failed to load user");
        const data = await res.json();
        setUser(data.user);

        // Load reward catalog
        const rRes = await fetch("/api/rewards");
        if (rRes.ok) {
          const rData = await rRes.json();
          setRewards(rData.rewards ?? []);
        }

        setAppState("ready");
      } catch (err) {
        console.error("Init error:", err);
        setAppState("error");
      }
    }
    init();
  }, []);

  // ── Pusher subscription ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusherClient.subscribe(`user-${user.line_uid}`);
    channel.bind(
      "point-update",
      (data: { newPoints: number; newTier: string; pointsEarned?: number; pointsBurned?: number; redeemedReward?: string }) => {
        setUser((prev) =>
          prev ? { ...prev, current_points: data.newPoints, tier: data.newTier } : prev
        );
        if (data.pointsEarned !== undefined) {
          showToast(`+${data.pointsEarned} points earned! Tier: ${data.newTier}`);
        } else if (data.redeemedReward) {
          showToast(`Redeemed: ${data.redeemedReward} (-${data.pointsBurned} pts)`);
        }
        // Refresh history if on that tab
        fetchHistory(user.line_uid);
      }
    );

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`user-${user.line_uid}`);
      pusherClient.disconnect();
    };
  }, [user?.line_uid, showToast, fetchHistory]);

  // ── Redeem handler ──────────────────────────────────────────────────────────
  async function handleRedeem(rewardId: string) {
    if (!user || redeeming) return;
    setRedeeming(rewardId);
    try {
      const res = await fetch("/api/points/burn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_uid: user.line_uid, reward_id: rewardId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Redemption failed.");
      }
      // UI update is handled by Pusher event
    } catch {
      showToast("Network error. Please try again.");
    } finally {
      setRedeeming(null);
    }
  }

  // ── Render states ───────────────────────────────────────────────────────────

  if (appState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06C755]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
      </div>
    );
  }

  if (appState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
        <p className="text-red-600 text-center font-medium">
          Failed to load. Please open this app inside LINE.
        </p>
      </div>
    );
  }

  if (!user) return null;

  const progress = tierProgress(user.total_spent, user.tier);
  const nextTier = getNextTier(user.tier);

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg animate-bounce">
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-[#06C755] text-white px-5 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
          <span className="text-[#06C755] text-xs font-bold">H</span>
        </div>
        <h1 className="text-lg font-bold tracking-wide">Hommall Rewards</h1>
      </header>

      <main className="max-w-md mx-auto px-4 space-y-6 pt-6">
        {/* ── Member Card ── */}
        <div
          className={`relative rounded-2xl p-6 text-white shadow-xl bg-gradient-to-br ${
            TIER_COLORS[user.tier] ?? TIER_COLORS.Member
          } overflow-hidden`}
        >
          {/* decorative circle */}
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />

          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-xs uppercase tracking-widest">Member</p>
                <p className="text-xl font-bold mt-0.5 truncate max-w-[200px]">
                  {user.display_name}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                  TIER_BADGE[user.tier] ?? TIER_BADGE.Member
                }`}
              >
                {user.tier}
              </span>
            </div>

            <div className="mt-6">
              <p className="text-white/70 text-xs uppercase tracking-widest">Points Balance</p>
              <p className="text-4xl font-extrabold tabular-nums">
                {user.current_points.toLocaleString()}
                <span className="text-lg font-normal ml-1">pts</span>
              </p>
            </div>

            {/* Tier progress */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>{user.tier}</span>
                <span>{nextTier ? nextTier.label : "MAX TIER"}</span>
              </div>
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {nextTier && (
                <p className="text-xs text-white/60 mt-1">
                  ฿{(nextTier.minSpent - user.total_spent).toLocaleString()} more spending to {nextTier.label}
                </p>
              )}
            </div>

            <p className="mt-3 text-xs text-white/50">
              Total Spent: ฿{user.total_spent.toLocaleString()}
            </p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setTab("rewards")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "rewards" ? "bg-[#06C755] text-white" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🎁 ของรางวัล
          </button>
          <button
            onClick={() => {
              setTab("history");
              if (user && transactions.length === 0) fetchHistory(user.line_uid);
            }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "history" ? "bg-[#06C755] text-white" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📋 ประวัติ
          </button>
        </div>

        {/* ── Reward Catalog ── */}
        {tab === "rewards" ? (
        <section>
          <h2 className="text-base font-bold text-gray-700 mb-3">Reward Catalog</h2>

          {rewards.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
              <p className="text-3xl mb-2">🎁</p>
              <p className="text-sm">No rewards available yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward) => {
                const canRedeem = user.current_points >= reward.required_points;
                const isRedeeming = redeeming === reward.id;
                return (
                  <div
                    key={reward.id}
                    className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {reward.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={reward.image_url}
                          alt={reward.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">🎁</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{reward.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {reward.required_points.toLocaleString()} pts required
                      </p>
                    </div>
                    <button
                      onClick={() => handleRedeem(reward.id)}
                      disabled={!canRedeem || isRedeeming}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                        canRedeem && !isRedeeming
                          ? "bg-[#06C755] text-white hover:bg-[#05a847] active:scale-95"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isRedeeming ? "..." : canRedeem ? "Redeem" : "Not enough"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        ) : null}

        {/* ── Transaction History ── */}
        {tab === "history" ? (
        <section>
          <h2 className="text-base font-bold text-gray-700 mb-3">ประวัติการรับ/ใช้คะแนน</h2>
          {loadingHistory ? (
            <div className="text-center py-8 text-gray-400">กำลังโหลด...</div>
          ) : transactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">ยังไม่มีประวัติ</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    tx.type === "earn" ? "bg-green-100" : "bg-red-100"
                  }`}>
                    <span className="text-lg">{tx.type === "earn" ? "💰" : "🎁"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {tx.description ?? (tx.type === "earn" ? "ได้รับคะแนน" : "แลกของรางวัล")}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleString("th-TH", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${
                    tx.type === "earn" ? "text-green-600" : "text-red-500"
                  }`}>
                    {tx.type === "earn" ? "+" : "-"}{tx.points_earned_or_burned.toLocaleString()} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
        ) : null}

        {/* ── Tier guide ── */}
        <section>
          <h2 className="text-base font-bold text-gray-700 mb-3">Tier Benefits</h2>
          <div className="grid grid-cols-2 gap-3">
            {TIER_CONFIG.map((t) => (
              <div
                key={t.label}
                className={`rounded-xl p-3 border-2 ${
                  user.tier === t.label
                    ? "border-[#06C755] bg-green-50"
                    : "border-transparent bg-white"
                } shadow-sm`}
              >
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white mb-1 ${
                    TIER_BADGE[t.label]
                  }`}
                >
                  {t.label}
                </span>
                <p className="text-xs text-gray-600">x{t.multiplier} points</p>
                <p className="text-xs text-gray-400">
                  ฿{t.minSpent.toLocaleString()}
                  {t.maxSpent ? ` – ฿${t.maxSpent.toLocaleString()}` : "+"}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
