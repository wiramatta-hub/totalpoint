"use client";

import { useState } from "react";
import useSWR from "swr";
import { Gift, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const typeLabels: Record<string, string> = {
  PHYSICAL: "ของรางวัลชิ้น",
  COUPON: "คูปองส่วนลด",
  HOMMALL_COUPON: "คูปอง Hommall",
  PRIVILEGE: "สิทธิพิเศษ",
  LOTTERY_TICKET: "สิทธิ์ชิงโชค",
};

export default function RewardsPage() {
  const { data, mutate } = useSWR("/api/rewards", fetcher);
  const rewards = data?.rewards ?? [];
  const [toast, setToast] = useState<string | null>(null);

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/rewards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    mutate();
  }

  async function deleteReward(id: string, name: string) {
    if (!confirm(`ยืนยันลบ "${name}" ?`)) return;
    const res = await fetch(`/api/rewards/${id}`, { method: "DELETE" });
    if (res.ok) {
      setToast(`"${name}" ถูกลบเรียบร้อยแล้ว`);
      setTimeout(() => setToast(null), 3000);
    }
    mutate();
  }

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ของรางวัล</h1>
          <p className="text-gray-500 text-sm">จัดการของรางวัลและคูปอง</p>
        </div>
        <a
          href="/rewards/new"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          เพิ่มของรางวัล
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map(
          (r: {
            id: string;
            nameTh: string;
            type: string;
            pointsCost: number;
            stock: number | null;
            stockUsed: number;
            isActive: boolean;
            couponValue: number | null;
            couponType: string | null;
          }) => (
            <div
              key={r.id}
              className={`bg-white rounded-xl border p-5 relative ${
                r.isActive ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {typeLabels[r.type] ?? r.type}
                  </span>
                  <h3 className="font-semibold text-gray-900 mt-2 text-sm">
                    {r.nameTh}
                  </h3>
                  <p className="text-xl font-bold text-green-700 mt-1">
                    {r.pointsCost.toLocaleString()}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      คะแนน
                    </span>
                  </p>
                  {r.couponValue && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      ส่วนลด{" "}
                      {r.couponType === "PERCENT"
                        ? `${r.couponValue}%`
                        : `฿${r.couponValue}`}
                    </p>
                  )}
                </div>
                <Gift size={20} className="text-green-500 flex-shrink-0" />
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {r.stock !== null
                    ? `คงเหลือ ${r.stock - r.stockUsed}/${r.stock}`
                    : "ไม่จำกัด"}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`/rewards/${r.id}/edit`}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Pencil size={13} />
                  </a>
                  <button
                    onClick={() => deleteReward(r.id, r.nameTh)}
                    className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600"
                    title="ลบ"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={() => toggleActive(r.id, r.isActive)}
                    className={`p-1 rounded ${
                      r.isActive ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {r.isActive ? (
                      <ToggleRight size={18} />
                    ) : (
                      <ToggleLeft size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        )}
        {rewards.length === 0 && (
          <div className="col-span-3 py-16 text-center text-gray-400">
            <Gift size={32} className="mx-auto mb-2 opacity-30" />
            <p>ยังไม่มีของรางวัล</p>
          </div>
        )}
      </div>
    </div>
  );
}
