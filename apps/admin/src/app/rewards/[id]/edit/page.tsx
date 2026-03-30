"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

const rewardTypes = [
  { value: "COUPON", label: "คูปองส่วนลด" },
  { value: "HOMMALL_COUPON", label: "คูปอง Hommall" },
  { value: "PHYSICAL", label: "ของรางวัลชิ้น" },
  { value: "PRIVILEGE", label: "สิทธิพิเศษ" },
  { value: "LOTTERY_TICKET", label: "สิทธิ์ชิงโชค" },
];

export default function EditRewardPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    nameTh: "",
    description: "",
    type: "COUPON",
    pointsCost: 100,
    stock: "",
    maxPerMember: "",
    maxPerDay: "",
    expiryDays: "",
    couponPrefix: "",
    couponValue: "",
    couponType: "FIXED" as "FIXED" | "PERCENT",
    hommallCouponValue: "",
    hommallCouponType: "FIXED" as "FIXED" | "PERCENT",
    isActive: true,
  });

  useEffect(() => {
    fetch(`/api/rewards/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.reward) {
          const r = data.reward;
          setForm({
            name: r.name || "",
            nameTh: r.nameTh || "",
            description: r.description || "",
            type: r.type || "COUPON",
            pointsCost: r.pointsCost || 100,
            stock: r.stock != null ? String(r.stock) : "",
            maxPerMember: r.maxPerMember != null ? String(r.maxPerMember) : "",
            maxPerDay: r.maxPerDay != null ? String(r.maxPerDay) : "",
            expiryDays: r.expiryDays != null ? String(r.expiryDays) : "",
            couponPrefix: r.couponPrefix || "",
            couponValue: r.couponValue != null ? String(r.couponValue) : "",
            couponType: r.couponType || "FIXED",
            hommallCouponValue:
              r.hommallCouponValue != null ? String(r.hommallCouponValue) : "",
            hommallCouponType: r.hommallCouponType || "FIXED",
            isActive: r.isActive ?? true,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setError("โหลดข้อมูลไม่สำเร็จ");
        setLoading(false);
      });
  }, [id]);

  function update(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: Record<string, unknown> = {
      name: form.name,
      nameTh: form.nameTh,
      description: form.description || undefined,
      type: form.type,
      pointsCost: Number(form.pointsCost),
      stock: form.stock ? Number(form.stock) : null,
      maxPerMember: form.maxPerMember ? Number(form.maxPerMember) : null,
      maxPerDay: form.maxPerDay ? Number(form.maxPerDay) : null,
      expiryDays: form.expiryDays ? Number(form.expiryDays) : null,
      isActive: form.isActive,
    };

    if (form.type === "COUPON") {
      payload.couponPrefix = form.couponPrefix || null;
      payload.couponValue = form.couponValue ? Number(form.couponValue) : null;
      payload.couponType = form.couponType;
    }
    if (form.type === "HOMMALL_COUPON") {
      payload.hommallCouponValue = form.hommallCouponValue
        ? Number(form.hommallCouponValue)
        : null;
      payload.hommallCouponType = form.hommallCouponType;
    }

    try {
      const res = await fetch(`/api/rewards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || "เกิดข้อผิดพลาด");
        setSaving(false);
        return;
      }

      router.push("/rewards");
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const isCoupon = form.type === "COUPON";
  const isHommall = form.type === "HOMMALL_COUPON";

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 text-sm"
      >
        <ArrowLeft size={16} />
        กลับ
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">แก้ไขของรางวัล</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
          <select
            value={form.type}
            onChange={(e) => update("type", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {rewardTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Name EN */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อ (EN) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Name TH */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อ (TH) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.nameTh}
            onChange={(e) => update("nameTh", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Points Cost */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            คะแนนที่ใช้แลก <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            required
            min={1}
            value={form.pointsCost}
            onChange={(e) => update("pointsCost", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Stock & Limits */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สต๊อก</label>
            <input
              type="number"
              min={1}
              value={form.stock}
              onChange={(e) => update("stock", e.target.value)}
              placeholder="ไม่จำกัด"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สูงสุด/คน</label>
            <input
              type="number"
              min={1}
              value={form.maxPerMember}
              onChange={(e) => update("maxPerMember", e.target.value)}
              placeholder="ไม่จำกัด"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สูงสุด/วัน</label>
            <input
              type="number"
              min={1}
              value={form.maxPerDay}
              onChange={(e) => update("maxPerDay", e.target.value)}
              placeholder="ไม่จำกัด"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Expiry Days */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            หมดอายุหลังแลก (วัน)
          </label>
          <input
            type="number"
            min={1}
            value={form.expiryDays}
            onChange={(e) => update("expiryDays", e.target.value)}
            placeholder="ไม่หมดอายุ"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Coupon fields */}
        {isCoupon && (
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-medium text-gray-900">ตั้งค่าคูปอง</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">มูลค่าส่วนลด</label>
                <input
                  type="number"
                  min={1}
                  value={form.couponValue}
                  onChange={(e) => update("couponValue", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทส่วนลด</label>
                <select
                  value={form.couponType}
                  onChange={(e) => update("couponType", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="FIXED">บาท</option>
                  <option value="PERCENT">เปอร์เซ็นต์</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prefix รหัสคูปอง
              </label>
              <input
                type="text"
                value={form.couponPrefix}
                onChange={(e) => update("couponPrefix", e.target.value)}
                placeholder="TP-"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* Hommall coupon fields */}
        {isHommall && (
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-medium text-gray-900">ตั้งค่าคูปอง Hommall</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">มูลค่าส่วนลด</label>
                <input
                  type="number"
                  min={1}
                  value={form.hommallCouponValue}
                  onChange={(e) => update("hommallCouponValue", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทส่วนลด</label>
                <select
                  value={form.hommallCouponType}
                  onChange={(e) => update("hommallCouponType", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="FIXED">บาท</option>
                  <option value="PERCENT">เปอร์เซ็นต์</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
            className="w-4 h-4 text-green-600 rounded border-gray-300"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">
            เปิดใช้งาน
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
        </button>
      </form>
    </div>
  );
}
