"use client";

import { useEffect, useState } from "react";

interface Reward {
  id: string;
  title: string;
  required_points: number;
  image_url: string | null;
  is_active: boolean;
}

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRewards();
  }, []);

  async function fetchRewards() {
    setLoading(true);
    try {
      const res = await fetch("/api/rewards");
      const data = await res.json();
      setRewards(data.rewards ?? []);
    } catch {
      console.error("Failed to fetch rewards");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !points) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), required_points: Number(points) }),
      });
      if (res.ok) {
        setTitle("");
        setPoints("");
        setShowForm(false);
        fetchRewards();
      }
    } catch {
      console.error("Failed to create reward");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🎁 ของรางวัล</h1>
          <p className="text-gray-500 text-sm mt-1">จัดการของรางวัลในแคตตาล็อก</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#06C755] hover:bg-[#05b04c] text-white font-medium rounded-xl text-sm transition-colors"
        >
          {showForm ? "ยกเลิก" : "+ เพิ่มของรางวัล"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อของรางวัล</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ส่วนลด 100 บาท"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#06C755] outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คะแนนที่ต้องใช้</label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="100"
              min="1"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#06C755] outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-[#06C755] hover:bg-[#05b04c] disabled:bg-gray-300 text-white font-medium rounded-xl text-sm transition-colors"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </form>
      )}

      {/* Rewards list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
      ) : rewards.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">🎁</p>
          <p>ยังไม่มีของรางวัล กด &quot;+ เพิ่มของรางวัล&quot; เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rewards.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <span className="text-2xl">🎁</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{r.title}</p>
                <p className="text-sm text-gray-400">{r.required_points.toLocaleString()} คะแนน</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-bold ${
                  r.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {r.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
