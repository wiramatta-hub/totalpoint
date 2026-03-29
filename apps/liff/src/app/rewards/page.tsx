"use client";

import { useState } from "react";
import useSWR from "swr";
import { Gift, AlertCircle, CheckCircle, X } from "lucide-react";
import { getRewards, redeemReward, type Reward } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

const REWARD_TYPE_LABELS: Record<string, string> = {
  PHYSICAL: "ของรางวัล",
  COUPON: "คูปอง",
  HOMMALL_COUPON: "คูปอง Hommall",
  PRIVILEGE: "สิทธิพิเศษ",
  LOTTERY_TICKET: "ลุ้นโชค",
};

interface RedeemState {
  reward: Reward;
  confirming: boolean;
  loading: boolean;
  success: { couponCode: string | null; expiresAt: string | null } | null;
  error: string | null;
}

export default function RewardsPage() {
  const { member, refreshMember } = useAuth();
  const { data, isLoading } = useSWR("rewards", getRewards);
  const [modal, setModal] = useState<RedeemState | null>(null);

  const rewards: Reward[] = data?.rewards ?? [];

  async function handleRedeem(reward: Reward) {
    setModal({ reward, confirming: true, loading: false, success: null, error: null });
  }

  async function confirmRedeem() {
    if (!modal) return;
    setModal((m) => m && { ...m, confirming: false, loading: true });
    try {
      const res = await redeemReward(modal.reward.id);
      await refreshMember();
      setModal((m) =>
        m && {
          ...m,
          loading: false,
          success: {
            couponCode: res.redemption.couponCode,
            expiresAt: res.redemption.expiresAt,
          },
        }
      );
    } catch (e) {
      setModal((m) =>
        m && { ...m, loading: false, error: e instanceof Error ? e.message : "แลกไม่สำเร็จ" }
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-2 text-xl font-bold text-gray-800">ของรางวัล</h1>
      {member && (
        <p className="mb-6 text-sm text-gray-500">
          คะแนนของคุณ{" "}
          <span className="font-semibold text-line-green">
            {member.currentPoints.toLocaleString("th-TH")} คะแนน
          </span>
        </p>
      )}

      {rewards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Gift className="h-14 w-14" />
          <p>ยังไม่มีของรางวัลในขณะนี้</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {rewards.map((reward) => {
            const available =
              reward.stock == null ||
              reward.stock - reward.stockUsed > 0;
            const canRedeem =
              available && (member?.currentPoints ?? 0) >= reward.pointsCost;

            return (
              <div
                key={reward.id}
                className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100"
              >
                {reward.imageUrl ? (
                  <img
                    src={reward.imageUrl}
                    alt={reward.nameTh}
                    className="h-28 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-28 items-center justify-center bg-gray-50">
                    <Gift className="h-10 w-10 text-gray-300" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-3">
                  <span className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    {REWARD_TYPE_LABELS[reward.type] ?? reward.type}
                  </span>
                  <p className="flex-1 text-sm font-semibold text-gray-800 leading-snug">
                    {reward.nameTh}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-line-green">
                      {reward.pointsCost.toLocaleString("th-TH")} แต้ม
                    </span>
                    {reward.stock != null && (
                      <span className="text-[10px] text-gray-400">
                        เหลือ {reward.stock - reward.stockUsed}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={!canRedeem}
                    className={`mt-2 w-full rounded-lg py-1.5 text-xs font-semibold transition ${
                      canRedeem
                        ? "bg-line-green text-white active:opacity-80"
                        : "cursor-not-allowed bg-gray-100 text-gray-400"
                    }`}
                  >
                    {!available
                      ? "หมดแล้ว"
                      : !canRedeem
                      ? "แต้มไม่พอ"
                      : "แลก"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-base font-bold text-gray-800">ยืนยันการแลก</h2>
              <button onClick={() => setModal(null)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {modal.success ? (
              <div className="text-center">
                <CheckCircle className="mx-auto mb-3 h-12 w-12 text-line-green" />
                <p className="font-semibold text-gray-800">แลกสำเร็จ!</p>
                {modal.success.couponCode && (
                  <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500 mb-1">รหัสคูปอง</p>
                    <p className="text-2xl font-bold tracking-widest text-line-green">
                      {modal.success.couponCode}
                    </p>
                    {modal.success.expiresAt && (
                      <p className="mt-1 text-xs text-gray-400">
                        หมดอายุ{" "}
                        {new Date(modal.success.expiresAt).toLocaleDateString("th-TH")}
                      </p>
                    )}
                  </div>
                )}
                <button onClick={() => setModal(null)} className="btn-line mt-4 w-full">
                  ปิด
                </button>
              </div>
            ) : modal.error ? (
              <div>
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 mb-4">
                  <AlertCircle className="h-4 w-4" />
                  {modal.error}
                </div>
                <button onClick={() => setModal(null)} className="btn-line w-full">
                  ปิด
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 rounded-xl bg-gray-50 p-4">
                  <p className="font-medium text-gray-800">{modal.reward.nameTh}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    ใช้ {modal.reward.pointsCost.toLocaleString("th-TH")} คะแนน
                  </p>
                  {modal.reward.description && (
                    <p className="mt-2 text-xs text-gray-400">{modal.reward.description}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setModal(null)}
                    className="rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmRedeem}
                    disabled={modal.loading}
                    className="rounded-lg bg-line-green py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {modal.loading ? "กำลังแลก..." : "ยืนยัน"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
