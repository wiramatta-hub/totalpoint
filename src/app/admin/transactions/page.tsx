"use client";

import { useEffect, useState } from "react";

interface Transaction {
  id: string;
  amount: number;
  points_earned_or_burned: number;
  type: string;
  description: string | null;
  created_at: string;
  user: {
    display_name: string;
    line_uid: string;
    tier: string;
  };
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState("");
  const [filterUid, setFilterUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const debounce = setTimeout(() => fetchTransactions(), 300);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterUid, page]);

  async function fetchTransactions() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      if (filterUid.trim()) params.set("line_uid", filterUid.trim());
      params.set("page", String(page));

      const res = await fetch(`/api/admin/transactions?${params}`);
      const data = await res.json();
      setTransactions(data.transactions ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      console.error("Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">📋 ประวัติ Transactions</h1>
        <p className="text-gray-500 text-sm mt-1">ทั้งหมด {total} รายการ</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={filterUid}
          onChange={(e) => { setFilterUid(e.target.value); setPage(1); }}
          placeholder="🔍 ค้นหาด้วย LINE UID"
          className="flex-1 min-w-[200px] px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#06C755] focus:border-transparent outline-none text-sm"
        />
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#06C755] outline-none text-sm"
        >
          <option value="">ทั้งหมด</option>
          <option value="earn">🟢 Earn</option>
          <option value="burn">🔴 Burn</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">ไม่พบรายการ</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="text-left px-4 py-3">วันที่</th>
                  <th className="text-left px-4 py-3">สมาชิก</th>
                  <th className="text-center px-4 py-3">ประเภท</th>
                  <th className="text-right px-4 py-3">ยอดซื้อ</th>
                  <th className="text-right px-4 py-3">คะแนน</th>
                  <th className="text-left px-4 py-3">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{tx.user.display_name}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tx.type === "earn" ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                          🟢 Earn
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                          🔴 Burn
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {tx.amount > 0 ? `฿${tx.amount.toLocaleString()}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      <span className={tx.type === "earn" ? "text-green-600" : "text-red-600"}>
                        {tx.type === "earn" ? "+" : "-"}
                        {tx.points_earned_or_burned.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                      {tx.description ?? "-"}
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
