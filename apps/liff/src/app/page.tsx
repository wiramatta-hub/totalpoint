"use client";

import useSWR from "swr";
import Link from "next/link";
import { Upload, Gift, ChevronRight, AlertCircle } from "lucide-react";
import PointCard from "@/components/point-card";
import { useAuth } from "@/contexts/auth-context";
import { getCampaigns, type Campaign } from "@/lib/api";

function CampaignBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PURCHASE: { label: "ซื้อออนไลน์", cls: "bg-blue-100 text-blue-700" },
    BOOTH: { label: "งานออกบูธ", cls: "bg-purple-100 text-purple-700" },
    ACTIVITY: { label: "กิจกรรม", cls: "bg-yellow-100 text-yellow-700" },
    BIRTHDAY: { label: "วันเกิด", cls: "bg-pink-100 text-pink-700" },
  };
  const { label, cls } = map[type] ?? { label: type, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function HomePage() {
  const { member, loading, error } = useAuth();
  const { data: campaignsData } = useSWR("campaigns", getCampaigns);

  const campaigns: Campaign[] = campaignsData?.campaigns ?? [];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line-green border-t-transparent" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600">{error ?? "ไม่พบข้อมูลสมาชิก"}</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Points Card */}
      <PointCard />

      {/* Quick Actions */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <Link
          href="/submit"
          className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 active:bg-gray-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50">
            <Upload className="h-5 w-5 text-line-green" />
          </div>
          <span className="text-sm font-medium text-gray-700">ส่งออเดอร์</span>
        </Link>
        <Link
          href="/rewards"
          className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 active:bg-gray-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50">
            <Gift className="h-5 w-5 text-amber-500" />
          </div>
          <span className="text-sm font-medium text-gray-700">แลกของรางวัล</span>
        </Link>
      </div>

      {/* Active Campaigns */}
      {campaigns.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between px-4">
            <h2 className="text-base font-semibold text-gray-800">แคมเปญที่เปิดอยู่</h2>
          </div>
          <div className="flex flex-col gap-2 px-4">
            {campaigns.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                href="/submit"
                className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 active:bg-gray-50"
              >
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.nameTh}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-line-green/10">
                    <Gift className="h-6 w-6 text-line-green" />
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-gray-800">{c.nameTh}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <CampaignBadge type={c.type} />
                    <span className="text-xs text-gray-400">
                      {c.pointsPerBaht} บาท/คะแนน
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tier Benefits */}
      {member.tier.benefits.length > 0 && (
        <section className="mx-4 mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            สิทธิพิเศษระดับ {member.tier.nameTh}
          </h2>
          <ul className="space-y-1.5">
            {member.tier.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line-green" />
                {b}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
