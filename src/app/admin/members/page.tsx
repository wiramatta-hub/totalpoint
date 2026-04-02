"use client";

import { useEffect, useState } from "react";

interface Member {
  id: string;
  line_uid: string;
  display_name: string;
  phone_number: string | null;
  current_points: number;
  total_spent: number;
  tier: string;
  created_at: string;
  _count: { transactions: number };
}

const TIER_COLORS: Record<string, string> = {
  Member: "bg-zinc-100 text-zinc-700",
  Silver: "bg-slate-200 text-slate-700",
  Gold: "bg-yellow-100 text-yellow-700",
  VIP: "bg-purple-100 text-purple-700",
};

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchMembers();
    }, 300);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: String(page) });
      const res = await fetch(`/api/admin/members?${params}`);
      const data = await res.json();
      setMembers(data.members ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      console.error("Failed to fetch members");
    } finally {
      setLoading(false);
    }
  }

  function copyUid(uid: string) {
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 1500);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">👥 สมาชิก</h1>
          <p className="text-gray-500 text-sm mt-1">ทั้งหมด {total} คน</p>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="🔍 ค้นหาชื่อ, LINE UID, เบอร์โทร..."
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#06C755] focus:border-transparent outline-none"
      />

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-gray-400">ไม่พบสมาชิก</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="text-left px-4 py-3">สมาชิก</th>
                  <th className="text-center px-4 py-3">ระดับ</th>
                  <th className="text-right px-4 py-3">คะแนน</th>
                  <th className="text-right px-4 py-3">ยอดสะสม</th>
                  <th className="text-center px-4 py-3">Transactions</th>
                  <th className="text-center px-4 py-3">LINE UID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{m.display_name}</p>
                      {m.phone_number && (
                        <p className="text-xs text-gray-400">{m.phone_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${TIER_COLORS[m.tier] ?? TIER_COLORS.Member}`}>
                        {m.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">
                      {m.current_points.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      ฿{m.total_spent.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">
                      {m._count.transactions}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => copyUid(m.line_uid)}
                        className="text-xs bg-gray-100 hover:bg-[#06C755] hover:text-white px-2 py-1 rounded-lg transition-colors"
                        title={m.line_uid}
                      >
                        {copiedUid === m.line_uid ? "✅ คัดลอกแล้ว" : "📋 คัดลอก UID"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-sm"
              >
                ← ก่อนหน้า
              </button>
              <span className="text-sm text-gray-500">
                หน้า {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-sm"
              >
                ถัดไป →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
