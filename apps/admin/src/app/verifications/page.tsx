"use client";

import { useState } from "react";
import useSWR from "swr";
import { CheckCircle, XCircle, Eye, Search, Image, Hash } from "lucide-react";
import { formatDateTime, channelLabels } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const StatusBadge = ({ s }: { s: string }) => {
  const cfg: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "รอตรวจสอบ", cls: "bg-yellow-100 text-yellow-700" },
    APPROVED: { label: "อนุมัติ", cls: "bg-green-100 text-green-700" },
    REJECTED: { label: "ปฏิเสธ", cls: "bg-red-100 text-red-700" },
    PROCESSING: { label: "ตรวจสอบ OCR", cls: "bg-blue-100 text-blue-700" },
  };
  const c = cfg[s] ?? { label: s, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.cls}`}>
      {c.label}
    </span>
  );
};

export default function VerificationsPage() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [channelFilter, setChannelFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pointsOverride, setPointsOverride] = useState("");
  const [processing, setProcessing] = useState(false);

  const params = new URLSearchParams({ status: statusFilter });
  if (channelFilter) params.set("channel", channelFilter);

  const { data, mutate } = useSWR(`/api/verifications?${params}`, fetcher, {
    refreshInterval: 10000,
  });

  const submissions = data?.submissions ?? [];
  const selectedSub = submissions.find(
    (s: { id: string }) => s.id === selected
  );

  async function review(id: string, action: "APPROVE" | "REJECT") {
    setProcessing(true);
    await fetch(`/api/verifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        note,
        ...(pointsOverride ? { pointsOverride: parseInt(pointsOverride) } : {}),
      }),
    });
    setSelected(null);
    setNote("");
    setPointsOverride("");
    setProcessing(false);
    mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ตรวจสอบหลักฐาน</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          อนุมัติหรือปฏิเสธหลักฐานการซื้อ
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {["PENDING", "APPROVED", "REJECTED", "PROCESSING"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-green-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              {
                {
                  PENDING: "รอตรวจสอบ",
                  APPROVED: "อนุมัติแล้ว",
                  REJECTED: "ปฏิเสธแล้ว",
                  PROCESSING: "กำลังตรวจสอบ",
                }[s]
              }
            </button>
          ))}
        </div>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="">ทุกช่องทาง</option>
          {Object.entries(channelLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-gray-400">
          {data?.pagination?.total ?? 0} รายการ
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">สมาชิก</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ช่องทาง</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ยอดซื้อ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">เวลา</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map(
                (s: {
                  id: string;
                  member: { lineDisplayName: string };
                  channel: string;
                  purchaseAmount: number | null;
                  orderNumber: string | null;
                  receiptUrl: string | null;
                  submittedAt: string;
                  status: string;
                }) => (
                  <tr
                    key={s.id}
                    className={`cursor-pointer transition-colors ${
                      selected === s.id
                        ? "bg-green-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelected(s.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {s.member.lineDisplayName ?? "ไม่ระบุ"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        {s.receiptUrl ? <Image size={12} /> : <Hash size={12} />}
                        {channelLabels[s.channel]}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {s.purchaseAmount
                        ? `฿${s.purchaseAmount.toLocaleString()}`
                        : s.orderNumber ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(s.submittedAt).toLocaleString("th-TH", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge s={s.status} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {submissions.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
              <p>ไม่มีรายการในสถานะนี้</p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {selectedSub ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">รายละเอียด</h3>

              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-400">สมาชิก</span>
                  <span className="font-medium">
                    {selectedSub.member.lineDisplayName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tier</span>
                  <span>{selectedSub.member.tier?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ช่องทาง</span>
                  <span>{channelLabels[selectedSub.channel]}</span>
                </div>
                {selectedSub.orderNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">เลขออเดอร์</span>
                    <span className="font-mono text-xs">
                      {selectedSub.orderNumber}
                    </span>
                  </div>
                )}
                {selectedSub.purchaseAmount && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">ยอดซื้อ</span>
                    <span className="font-semibold text-green-700">
                      ฿{selectedSub.purchaseAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedSub.ocrConfidence > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">OCR Confidence</span>
                    <span>
                      {(selectedSub.ocrConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Receipt image */}
              {selectedSub.receiptUrl && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">ใบเสร็จ/สลิป</p>
                  <img
                    src={selectedSub.receiptUrl}
                    alt="receipt"
                    className="w-full rounded-lg border border-gray-200 object-contain max-h-52"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              {selectedSub.status === "PENDING" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Override คะแนน (ปล่อยว่าง = คำนวณอัตโนมัติ)
                    </label>
                    <input
                      type="number"
                      value={pointsOverride}
                      onChange={(e) => setPointsOverride(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                      placeholder="เช่น 250"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      หมายเหตุ
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                      rows={2}
                      placeholder="เหตุผล..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => review(selectedSub.id, "REJECT")}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle size={15} />
                      ปฏิเสธ
                    </button>
                    <button
                      onClick={() => review(selectedSub.id, "APPROVE")}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle size={15} />
                      อนุมัติ
                    </button>
                  </div>
                </>
              )}

              {selectedSub.status !== "PENDING" && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-gray-500 text-xs mb-1">ผลการตรวจสอบ</p>
                  <StatusBadge s={selectedSub.status} />
                  {selectedSub.reviewNote && (
                    <p className="text-gray-600 mt-2 text-xs">
                      {selectedSub.reviewNote}
                    </p>
                  )}
                  {selectedSub.pointsEarned && (
                    <p className="text-green-700 font-semibold mt-1">
                      +{selectedSub.pointsEarned} คะแนน
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Eye size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">เลือกรายการเพื่อดูรายละเอียด</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
