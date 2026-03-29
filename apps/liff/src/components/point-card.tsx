"use client";

import { useAuth } from "@/contexts/auth-context";

const TIER_COLORS: Record<string, string> = {
  "#C0C0C0": "bg-[#C0C0C0]",
  "#FFD700": "bg-[#FFD700]",
  "#E5E4E2": "bg-[#E5E4E2]",
  "#06C755": "bg-line-green",
};

function tierBg(color: string) {
  return TIER_COLORS[color] ?? "bg-gray-300";
}

export default function PointCard() {
  const { member } = useAuth();

  if (!member) return null;

  const { currentPoints, lifetimePoints, tier, nextTier, pointsToNextTier } = member;
  const progress =
    nextTier && pointsToNextTier != null
      ? Math.min(
          100,
          ((lifetimePoints - tier.minLifetimePoints) /
            (lifetimePoints - tier.minLifetimePoints + pointsToNextTier)) *
            100
        )
      : 100;

  return (
    <div className="mx-4 rounded-2xl bg-gradient-to-br from-line-green to-[#038f3c] p-5 text-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-80">
            {member.lineDisplayName ?? "สมาชิก"}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold text-gray-800 ${tierBg(tier.color)}`}
            >
              {tier.nameTh}
            </span>
          </div>
        </div>
        {member.linePictureUrl && (
          <img
            src={member.linePictureUrl}
            alt="profile"
            className="h-12 w-12 rounded-full border-2 border-white/40 object-cover"
          />
        )}
      </div>

      {/* Points */}
      <div className="mt-4">
        <p className="text-4xl font-bold tracking-tight">
          {currentPoints.toLocaleString("th-TH")}
        </p>
        <p className="text-sm opacity-80">คะแนนสะสม</p>
      </div>

      {/* Progress to next tier */}
      {nextTier && pointsToNextTier != null && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs opacity-80">
            <span>สะสมสู่ {nextTier.nameTh}</span>
            <span>อีก {pointsToNextTier.toLocaleString("th-TH")} คะแนน</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
