"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Pencil,
  ArrowLeft,
  Pause,
  Play,
  Trash2,
  QrCode,
  Copy,
  Check,
} from "lucide-react";
import { useState, useRef } from "react";
import { formatDate, formatDateTime, channelLabels } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const typeLabels: Record<string, string> = {
  PURCHASE: "สะสมจากการซื้อสินค้า",
  BOOTH: "งานออกบูธ",
  ACTIVITY: "กิจกรรม",
  BIRTHDAY: "วันเกิด",
};

const statusCfg: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "ร่าง", cls: "bg-gray-100 text-gray-600" },
  ACTIVE: { label: "ใช้งาน", cls: "bg-green-100 text-green-700" },
  PAUSED: { label: "หยุดชั่วคราว", cls: "bg-yellow-100 text-yellow-700" },
  ENDED: { label: "สิ้นสุด", cls: "bg-red-100 text-red-700" },
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, mutate } = useSWR(`/api/campaigns/${id}`, fetcher);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        กำลังโหลด...
      </div>
    );
  }

  const c = data.campaign;
  if (!c) {
    return (
      <div className="text-center py-20 text-gray-400">ไม่พบแคมเปญ</div>
    );
  }

  const st = statusCfg[c.status] ?? {
    label: c.status,
    cls: "bg-gray-100 text-gray-700",
  };

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function toggleStatus() {
    const next = c.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      showToast(
        next === "ACTIVE" ? "เปิดใช้งานแคมเปญแล้ว" : "หยุดแคมเปญชั่วคราว"
      );
      mutate();
    }
  }

  async function deleteCampaign() {
    if (!confirm(`ยืนยันลบแคมเปญ "${c.nameTh}" ?`)) return;
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/campaigns");
    } else {
      const err = await res.json().catch(() => null);
      showToast(err?.error ?? "เกิดข้อผิดพลาด", "error");
    }
  }

  function copyBoothCode() {
    if (c.boothEventCode) {
      navigator.clipboard.writeText(c.boothEventCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const qrUrl = c.boothEventCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(c.boothEventCode)}`
    : null;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"} text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {toast.type === "success" ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            )}
          </svg>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/campaigns")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{c.nameTh}</h1>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.cls}`}
            >
              {st.label}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{c.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {(c.status === "ACTIVE" || c.status === "PAUSED") && (
            <button
              onClick={toggleStatus}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${
                c.status === "ACTIVE"
                  ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              }`}
            >
              {c.status === "ACTIVE" ? (
                <Pause size={14} />
              ) : (
                <Play size={14} />
              )}
              {c.status === "ACTIVE" ? "หยุดชั่วคราว" : "เปิดใช้งาน"}
            </button>
          )}
          <a
            href={`/campaigns/${id}/edit`}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Pencil size={14} />
            แก้ไข
          </a>
          <button
            onClick={deleteCampaign}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            title="ลบแคมเปญ"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="ออเดอร์ทั้งหมด" value={c._count?.orderSubmissions ?? 0} />
        <StatCard label="สิทธิ์ลุ้นโชค" value={c._count?.lotteryEntries ?? 0} />
        <StatCard
          label="เริ่มต้น"
          value={formatDate(c.startDate)}
          isText
        />
        <StatCard
          label="สิ้นสุด"
          value={formatDate(c.endDate)}
          isText
        />
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">ข้อมูลทั่วไป</h2>
          <InfoRow label="ประเภท" value={typeLabels[c.type] ?? c.type} />
          {c.description && (
            <InfoRow label="คำอธิบาย" value={c.description} />
          )}
          <InfoRow
            label="สร้างเมื่อ"
            value={formatDateTime(c.createdAt)}
          />
          <InfoRow
            label="อัปเดตล่าสุด"
            value={formatDateTime(c.updatedAt)}
          />
        </section>

        {/* Point Rules */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">กติกาคะแนน</h2>
          <InfoRow label="บาทต่อ 1 คะแนน" value={c.pointsPerBaht} />
          <InfoRow label="ตัวคูณพิเศษ" value={`x${c.pointMultiplier}`} />
          <InfoRow
            label="ยอดซื้อขั้นต่ำ"
            value={`฿${c.minPurchaseAmount.toLocaleString()}`}
          />
          <InfoRow
            label="คะแนนสูงสุด/ออเดอร์"
            value={c.maxPointsPerOrder ?? "ไม่จำกัด"}
          />
          {c.maxOrdersPerDay && (
            <InfoRow
              label="ออเดอร์สูงสุด/วัน"
              value={c.maxOrdersPerDay}
            />
          )}
        </section>
      </div>

      {/* Channels */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">ช่องทางที่ร่วมแคมเปญ</h2>
        <div className="flex flex-wrap gap-2">
          {(c.channels ?? []).map((ch: string) => (
            <span
              key={ch}
              className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              {channelLabels[ch] ?? ch}
            </span>
          ))}
        </div>
      </section>

      {/* Booth Event */}
      {c.isBoothEvent && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">งานออกบูธ</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <InfoRow label="รหัสงาน" value={c.boothEventCode ?? "-"} />
                {c.boothEventCode && (
                  <button
                    onClick={copyBoothCode}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                    title="คัดลอก"
                  >
                    {copied ? (
                      <Check size={14} className="text-green-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                )}
              </div>
              <InfoRow
                label="คะแนนโบนัส"
                value={`${c.boothBonusPoints} คะแนน`}
              />
              {c.boothEventCode && (
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  <QrCode size={16} />
                  {showQr ? "ซ่อน QR Code" : "แสดง QR Code"}
                </button>
              )}
            </div>
            {showQr && qrUrl && (
              <div ref={qrRef} className="bg-white p-4 rounded-xl border shadow-sm">
                <img
                  src={qrUrl}
                  alt={`QR: ${c.boothEventCode}`}
                  width={200}
                  height={200}
                  className="rounded"
                />
                <p className="text-center text-xs text-gray-500 mt-2 font-mono">
                  {c.boothEventCode}
                </p>
                <a
                  href={qrUrl}
                  download={`qr-${c.boothEventCode}.png`}
                  className="block mt-2 text-center text-xs text-green-600 hover:underline"
                >
                  ดาวน์โหลด QR Code
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Lottery Config */}
      {c.hasLottery && c.lotteryConfig && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">ระบบลุ้นโชค</h2>
          <InfoRow
            label="ยอดซื้อต่อ 1 สิทธิ์"
            value={
              c.lotteryPurchasePerTicket
                ? `฿${c.lotteryPurchasePerTicket.toLocaleString()}`
                : "-"
            }
          />
          <InfoRow
            label="จำนวนสิทธิ์ทั้งหมด"
            value={c._count?.lotteryEntries ?? 0}
          />
          <InfoRow
            label="วันจับรางวัล"
            value={
              c.lotteryConfig.drawDate
                ? formatDateTime(c.lotteryConfig.drawDate)
                : "ยังไม่กำหนด"
            }
          />
          <InfoRow
            label="สถานะ"
            value={c.lotteryConfig.isDrawn ? "จับรางวัลแล้ว" : "รอจับรางวัล"}
          />
        </section>
      )}

      {/* Linked Rewards */}
      {c.campaignRewards?.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">ของรางวัลที่เชื่อมต่อ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {c.campaignRewards.map(
              (cr: { id: string; reward: { nameTh: string; pointsCost: number; type: string } }) => (
                <div
                  key={cr.id}
                  className="border border-gray-200 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {cr.reward.nameTh}
                    </p>
                    <p className="text-xs text-gray-500">
                      {cr.reward.pointsCost.toLocaleString()} คะแนน
                    </p>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {cr.reward.type}
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  isText,
}: {
  label: string;
  value: string | number;
  isText?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 font-bold ${isText ? "text-sm text-gray-700" : "text-xl text-green-700"}`}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-gray-500 min-w-[120px]">{label}</span>
      <span className="text-gray-900 font-medium">{String(value)}</span>
    </div>
  );
}
