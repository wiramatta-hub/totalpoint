"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewCampaignPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      type: "PURCHASE",
      status: "DRAFT",
      pointsPerBaht: 1,
      minPurchaseAmount: 200,
      pointMultiplier: 1,
      channels: ["SHOPEE", "TIKTOK", "LAZADA"],
      isBoothEvent: false,
      hasLottery: false,
      boothBonusPoints: 0,
    },
  });

  const watchChannels = watch("channels");
  const watchHasLottery = watch("hasLottery");
  const watchIsBoothEvent = watch("isBoothEvent");

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
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(JSON.stringify(err.error));
        return;
      }
      router.push("/campaigns");
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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">สร้างแคมเปญใหม่</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          กำหนดเงื่อนไขการสะสมคะแนน ช่องทาง และรางวัล
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">ข้อมูลทั่วไป</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="ชื่อแคมเปญ (EN)" error={errors.name?.message}>
              <input {...register("name")} className={inputCls} placeholder="Summer Sale 2026" />
            </Field>
            <Field label="ชื่อแคมเปญ (TH)" error={errors.nameTh?.message}>
              <input {...register("nameTh")} className={inputCls} placeholder="แคมเปญซัมเมอร์" />
            </Field>
          </div>

          <Field label="คำอธิบาย">
            <textarea
              {...register("description")}
              className={inputCls}
              rows={2}
              placeholder="รายละเอียดแคมเปญ..."
            />
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
            <Field label="สถานะเริ่มต้น">
              <select {...register("status")} className={inputCls}>
                <option value="DRAFT">ร่าง</option>
                <option value="ACTIVE">เปิดใช้งานทันที</option>
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
            <Field
              label="คะแนนต่อ 1 บาท"
              error={errors.pointsPerBaht?.message}
            >
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
            <Field
              label="ยอดซื้อขั้นต่ำ (บาท)"
              error={errors.minPurchaseAmount?.message}
            >
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
                <input {...register("boothEventCode")} className={inputCls} placeholder="BOOTH2026" />
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
            onClick={() => router.push("/campaigns")}
            className="flex-1 px-6 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกแคมเปญ"}
          </button>
        </div>
      </form>
    </div>
  );
}
