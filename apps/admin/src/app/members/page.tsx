"use client";

import { useState } from "react";
import useSWR from "swr";
import { Search, Star, Shield } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MembersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const { data } = useSWR(`/api/members?search=${query}&limit=50`, fetcher);
  const members = data?.members ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">สมาชิก</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          จัดการและค้นหาสมาชิกทั้งหมด
        </p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setQuery(search)}
            placeholder="ค้นหาชื่อ, เบอร์โทร, อีเมล..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          onClick={() => setQuery(search)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
        >
          ค้นหา
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600">
              <th className="text-left px-5 py-3 font-medium">สมาชิก</th>
              <th className="text-left px-5 py-3 font-medium">Tier</th>
              <th className="text-left px-5 py-3 font-medium">คะแนนปัจจุบัน</th>
              <th className="text-left px-5 py-3 font-medium">คะแนนสะสม</th>
              <th className="text-left px-5 py-3 font-medium">เบอร์โทร</th>
              <th className="text-left px-5 py-3 font-medium">สมัครวันที่</th>
              <th className="text-left px-5 py-3 font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map(
              (m: {
                id: string;
                lineDisplayName: string;
                linePictureUrl: string;
                firstName: string;
                lastName: string;
                phone: string;
                currentPoints: number;
                lifetimePoints: number;
                tier: { name: string; color: string };
                status: string;
                registeredAt: string;
              }) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {m.linePictureUrl ? (
                        <img
                          src={m.linePictureUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-xs font-bold">
                            {(m.lineDisplayName ?? "?")[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {m.firstName
                            ? `${m.firstName} ${m.lastName}`
                            : m.lineDisplayName ?? "ไม่ระบุ"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {m.lineDisplayName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: m.tier?.color + "20",
                        color: m.tier?.color,
                      }}
                    >
                      {m.tier?.name}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-semibold text-green-700">
                      {m.currentPoints.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {m.lifetimePoints.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {m.phone ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">
                    {new Date(m.registeredAt).toLocaleDateString("th-TH")}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {m.status === "ACTIVE" ? "ใช้งาน" : m.status}
                    </span>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        {members.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <Shield size={32} className="mx-auto mb-2 opacity-30" />
            <p>ไม่พบสมาชิก</p>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400">
        แสดง {members.length} / {data?.pagination?.total ?? 0} รายการ
      </p>
    </div>
  );
}
