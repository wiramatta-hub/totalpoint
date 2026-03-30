"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { campaignSchema, type CampaignInput } from "@/lib/validators";

const CHANNELS = [
  { value: "SHOPEE", label: "Shopee" },
  { value: "TIKTOK", label: "TikTok Shop" },
  { value: "LAZADA", label: "Lazada" },
  { value: "BOOTH", label: "งานออกบูธ" },
  { value: "HOMMALL", label: "Hommall" },
  { value: "MANUAL", label: "Manual" },
];

function generateBoothCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length: 8 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
  return `BOOTH-${code}`;
}

function toLocalDatetime(date: string | Date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema),
  });

  const watchChannels = watch("channels");
  const watchHasLottery = watch("hasLottery");
  const watchIsBoothEvent = watch("isBoothEvent");

  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.campaign) {
          const c = data.campaign;
          reset({
            name: c.name,
            nameTh: c.nameTh,
            description: c.description ?? "",
            type: c.type,
            status: c.status,
            startDate: toLocalDatetime(c.startDate),
            endDate: toLocalDatetime(c.endDate),
            pointsPerBaht: c.pointsPerBaht,
            minPurchaseAmount: c.minPurchaseAmount,
            maxPointsPerOrder: c.maxPointsPerOrder,
            maxOrdersPerDay: c.maxOrdersPerDay,
            pointMultiplier: c.pointMultiplier,
            channels: c.channels,
            isBoothEvent: c.isBoothEvent,
            boothEventCode: c.boothEventCode ?? "",
            boothBonusPoints: c.boothBonusPoints,
            hasLottery: c.hasLottery,
            lotteryPurchasePerTicket: c.lotteryPurchasePerTicket,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id, reset]);

  function toggleChannel(ch: string) {
    const current = watchChannels ?? [];
    if (current.includes(ch as "SHOPEE")) {
      setValue(
        "channels",
        current.filter((c) => c !== ch) as CampaignInput["channels"]
      );
    } else {
      setValue("channels", [...current, ch] as CampaignInput["channels"]);
    }
  }

  async function onSubmit(data: CampaignInput) {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(JSON.stringify(err.error));
        return;
      }
      router.push(`/campaigns/${id}`);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  const Field = ({
    label,
    children,
    error,
  }: {
    label: string;
    children: React.ReactNode;
    error?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">แก้ไขแคมเปญ</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          แก้ไขเงื่อนไขการสะสมคะแนน ช่องทาง และรางวัล
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">ข้อมูลทั่วไป</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="ชื่อแคมเปญ (EN)" error={errors.name?.message}>
              <input {...register("name")} className={inputCls} />
            </Field>
            <Field label="ชื่อแคมเปญ (TH)" error={errors.nameTh?.message}>
              <input {...register("nameTh")} className={inputCls} />
            </Field>
          </div>

          <Field label="คำอธิบาย">
            <textarea {...register("description")} className={inputCls} rows={2} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="ประเภท" error={errors.type?.message}>
              <select {...register("type")} className={inputCls}>
                <option value="PURCHASE">สะสมจากการซื้อสินค้า</option>
                <option value="BOOTH">งานออกบูธ</option>
                <option value="ACTIVITY">กิจกรรม</option>
                <option value="BIRTHDAY">วันเกิด</option>
              </select>
            </Field>
            <Field label="สถานะ">
              <select {...register("status")} className={inputCls}>
                <option value="DRAFT">ร่าง</option>
                <option value="ACTIVE">เปิดใช้งาน</option>
                <option value="PAUSED">หยุดชั่วคราว</option>
                <option value="ENDED">สิ้นสุด</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="วันเริ่มต้น" error={errors.startDate?.message}>
              <input type="datetime-local" {...register("startDate")} className={inputCls} />
            </Field>
            <Field label="วันสิ้นสุด" error={errors.endDate?.message}>
              <input type="datetime-local" {...register("endDate")} className={inputCls} />
            </Field>
          </div>
        </section>

        {/* Point Rules */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">กติกาคะแนน</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="บาทต่อ 1 คะแนน" error={errors.pointsPerBaht?.message}>
              <input
                type="number"
                step="0.1"
                {...register("pointsPerBaht", { valueAsNumber: true })}
                className={inputCls}
              />
            </Field>
            <Field label="ตัวคูณพิเศษ" error={errors.pointMultiplier?.message}>
              <input
                type="number"
                step="0.1"
                {...register("pointMultiplier", { valueAsNumber: true })}
                className={inputCls}
              />
            </Field>
            <Field label="ยอดซื้อขั้นต่ำ (บาท)" error={errors.minPurchaseAmount?.message}>
              <input
                type="number"
                {...register("minPurchaseAmount", { valueAsNumber: true })}
                className={inputCls}
              />
            </Field>
            <Field label="จำกัดคะแนนสูงสุดต่อออเดอร์">
              <input
                type="number"
                {...register("maxPointsPerOrder", { valueAsNumber: true })}
                className={inputCls}
                placeholder="ไม่จำกัด"
              />
            </Field>
          </div>
        </section>

        {/* Channel Selection */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">ช่องทางที่ร่วมแคมเปญ</h2>
          {errors.channels && (
            <p className="text-xs text-red-500">{errors.channels.message as string}</p>
          )}
          <div className="grid grid-cols-3 gap-3">
            {CHANNELS.map((ch) => (
              <button
                key={ch.value}
                type="button"
                onClick={() => toggleChannel(ch.value)}
                className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  watchChannels?.includes(ch.value as "SHOPEE")
                    ? "bg-green-600 border-green-600 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-green-300"
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </section>

        {/* Booth Event */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isBoothEvent"
              {...register("isBoothEvent")}
              className="rounded"
            />
            <label htmlFor="isBoothEvent" className="font-semibold text-gray-900 cursor-pointer">
              เปิดใช้งานสำหรับงานออกบูธ
            </label>
          </div>
          {watchIsBoothEvent && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="รหัสงาน (สำหรับ QR)">
                <div className="flex gap-2">
                  <input {...register("boothEventCode")} className={inputCls + " flex-1"} placeholder="BOOTH-XXXXXXXX" />
                  <button
                    type="button"
                    onClick={() => setValue("boothEventCode", generateBoothCode())}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg whitespace-nowrap"
                  >
                    สุ่มรหัส
                  </button>
                </div>
              </Field>
              <Field label="คะแนนโบนัสสำหรับงานบูธ">
                <input
                  type="number"
                  {...register("boothBonusPoints", { valueAsNumber: true })}
                  className={inputCls}
                />
              </Field>
            </div>
          )}
        </section>

        {/* Lottery */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="hasLottery"
              {...register("hasLottery")}
              className="rounded"
            />
            <label htmlFor="hasLottery" className="font-semibold text-gray-900 cursor-pointer">
              เพิ่มระบบลุ้นโชค (Lottery)
            </label>
          </div>
          {watchHasLottery && (
            <Field label="ยอดซื้อต่อ 1 สิทธิ์ (บาท)" error={errors.lotteryPurchasePerTicket?.message}>
              <input
                type="number"
                {...register("lotteryPurchasePerTicket", { valueAsNumber: true })}
                className={inputCls}
                placeholder="500"
              />
            </Field>
          )}
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push(`/campaigns/${id}`)}
            className="flex-1 px-6 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </button>
        </div>
      </form>
    </div>
  );
}
