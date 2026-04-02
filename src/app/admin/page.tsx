"use client";

import { useState } from "react";

export default function AdminEarnPage() {
  const [lineUid, setLineUid] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    pointsEarned?: number;
    newPoints?: number;
    newTier?: string;
    tierUpgraded?: boolean;
    totalSpent?: number;
  } | null>(null);

  // Quick amount buttons
  const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lineUid.trim() || !amount) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/points/earn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_uid: lineUid.trim(),
          purchase_amount: Number(amount),
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      setResult(data);

      if (data.success) {
        setAmount("");
        setDescription("");
      }
    } catch {
      setResult({ error: "Network error. ลองใหม่อีกครั้ง" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">🎯 ให้คะแนนลูกค้า</h1>
        <p className="text-gray-500 text-sm mt-1">กดให้คะแนนเมื่อลูกค้าซื้อสินค้า</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        {/* LINE UID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LINE UID ของลูกค้า</label>
          <input
            type="text"
            value={lineUid}
            onChange={(e) => setLineUid(e.target.value)}
            placeholder="Uxxxxxxxxxxxxxxxxx"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#06C755] focus:border-transparent outline-none"
            required
          />
          <p className="text-xs text-gray-400 mt-1">ดูได้จากหน้าสมาชิก หรือสแกน QR</p>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ยอดซื้อ (บาท)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            min="1"
            step="0.01"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#06C755] focus:border-transparent outline-none text-2xl font-bold text-center"
            required
          />
          {/* Quick buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {QUICK_AMOUNTS.map((qa) => (
              <button
                key={qa}
                type="button"
                onClick={() => setAmount(String(qa))}
                className="px-3 py-1.5 bg-gray-100 hover:bg-[#06C755] hover:text-white text-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                ฿{qa.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด (ไม่บังคับ)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="เช่น ซื้อแชมพู 2 ขวด"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#06C755] focus:border-transparent outline-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !lineUid.trim() || !amount}
          className="w-full py-4 bg-[#06C755] hover:bg-[#05b04c] disabled:bg-gray-300 text-white font-bold text-lg rounded-xl transition-colors"
        >
          {loading ? "กำลังบันทึก..." : "✅ ให้คะแนน"}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div
          className={`rounded-2xl p-5 ${
            result.success
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {result.success ? (
            <div className="space-y-2">
              <p className="text-green-700 font-bold text-lg">✅ สำเร็จ!</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-gray-500">คะแนนที่ได้</p>
                  <p className="text-2xl font-bold text-[#06C755]">+{result.pointsEarned}</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-gray-500">คะแนนรวม</p>
                  <p className="text-2xl font-bold text-gray-800">{result.newPoints?.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-gray-500">ระดับ</p>
                  <p className="text-lg font-bold text-gray-800">{result.newTier}</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-gray-500">ยอดสะสม</p>
                  <p className="text-lg font-bold text-gray-800">฿{result.totalSpent?.toLocaleString()}</p>
                </div>
              </div>
              {result.tierUpgraded && (
                <p className="text-center text-yellow-600 font-bold text-lg mt-2">
                  🎉 อัปเกรดเป็น {result.newTier}!
                </p>
              )}
            </div>
          ) : (
            <p className="text-red-600 font-medium">❌ {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
