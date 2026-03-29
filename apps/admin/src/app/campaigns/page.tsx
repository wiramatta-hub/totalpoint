"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import { formatDate, channelLabels } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "ร่าง", cls: "bg-gray-100 text-gray-600" },
    ACTIVE: { label: "ใช้งาน", cls: "bg-green-100 text-green-700" },
    PAUSED: { label: "หยุดชั่วคราว", cls: "bg-yellow-100 text-yellow-700" },
    ENDED: { label: "สิ้นสุด", cls: "bg-red-100 text-red-700" },
  };
  const c = cfg[status] ?? { label: status, cls: "bg-gray-100 text-gray-700" };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.cls}`}>
      {c.label}
    </span>
  );
};

export default function CampaignsPage() {
  const [status, setStatus] = useState("");
  const { data, mutate } = useSWR(
    `/api/campaigns?${status ? `status=${status}` : ""}`,
    fetcher
  );

  async function toggleStatus(id: string, current: string) {
    const next =
      current === "ACTIVE" ? "PAUSED" : current === "PAUSED" ? "ACTIVE" : null;
    if (!next) return;
    await fetch(`/api/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    mutate();
  }

  async function deleteCampaign(id: string) {
    if (!confirm("ยืนยันการลบแคมเปญนี้?")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    mutate();
  }

  const campaigns = data?.campaigns ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">แคมเปญ</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            จัดการแคมเปญสะสมแต้มและของรางวัล
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          สร้างแคมเปญใหม่
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "", label: "ทั้งหมด" },
          { value: "ACTIVE", label: "ใช้งาน" },
          { value: "DRAFT", label: "ร่าง" },
          { value: "PAUSED", label: "หยุดชั่วคราว" },
          { value: "ENDED", label: "สิ้นสุดแล้ว" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === f.value
                ? "bg-green-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-600">
              <th className="text-left px-5 py-3 font-medium">ชื่อแคมเปญ</th>
              <th className="text-left px-5 py-3 font-medium">ประเภท</th>
              <th className="text-left px-5 py-3 font-medium">ช่องทาง</th>
              <th className="text-left px-5 py-3 font-medium">ระยะเวลา</th>
              <th className="text-left px-5 py-3 font-medium">คะแนน/บาท</th>
              <th className="text-left px-5 py-3 font-medium">สถานะ</th>
              <th className="text-left px-5 py-3 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.map(
              (c: {
                id: string;
                nameTh: string;
                type: string;
                channels: string[];
                startDate: string;
                endDate: string;
                pointsPerBaht: number;
                pointMultiplier: number;
                status: string;
                _count: { orderSubmissions: number };
              }) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{c.nameTh}</p>
                    <p className="text-gray-400 text-xs">
                      {c._count.orderSubmissions} รายการ
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {
                        {
                          PURCHASE: "ซื้อสินค้า",
                          BOOTH: "งานบูธ",
                          ACTIVITY: "กิจกรรม",
                          BIRTHDAY: "วันเกิด",
                        }[c.type as "PURCHASE" | "BOOTH" | "ACTIVITY" | "BIRTHDAY"]
                      }
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 flex-wrap max-w-32">
                      {c.channels.slice(0, 3).map((ch) => (
                        <span
                          key={ch}
                          className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                        >
                          {channelLabels[ch] ?? ch}
                        </span>
                      ))}
                      {c.channels.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{c.channels.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-600">
                    <p>{formatDate(c.startDate)}</p>
                    <p className="text-gray-400">ถึง {formatDate(c.endDate)}</p>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="font-mono font-semibold text-green-700">
                      x{c.pointsPerBaht * c.pointMultiplier}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900"
                      >
                        <Eye size={15} />
                      </Link>
                      <Link
                        href={`/campaigns/${c.id}/edit`}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900"
                      >
                        <Pencil size={15} />
                      </Link>
                      {c.status !== "ENDED" && (
                        <button
                          onClick={() => toggleStatus(c.id, c.status)}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-green-700"
                          title={c.status === "ACTIVE" ? "หยุดชั่วคราว" : "เปิดใช้งาน"}
                        >
                          {c.status === "ACTIVE" ? "⏸" : "▶"}
                        </button>
                      )}
                      <button
                        onClick={() => deleteCampaign(c.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        {campaigns.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <Megaphone size={32} className="mx-auto mb-2 opacity-30" />
            <p>ยังไม่มีแคมเปญ</p>
            <Link
              href="/campaigns/new"
              className="text-green-600 hover:underline text-sm mt-1 inline-block"
            >
              สร้างแคมเปญแรก →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Prevent unused import warning
const Megaphone = Plus;
