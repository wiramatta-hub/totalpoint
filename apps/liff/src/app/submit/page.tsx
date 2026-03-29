"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import { Upload, Hash, CheckCircle, AlertCircle, Camera, X } from "lucide-react";
import { submitOrder, uploadReceipt, getCampaigns, type Campaign } from "@/lib/api";

const CHANNELS = [
  { value: "SHOPEE", label: "Shopee" },
  { value: "TIKTOK", label: "TikTok Shop" },
  { value: "LAZADA", label: "Lazada" },
  { value: "BOOTH", label: "งานออกบูธ" },
  { value: "HOMMALL", label: "Hommall" },
] as const;

const orderSchema = z.object({
  channel: z.string().min(1, "กรุณาเลือกช่องทาง"),
  orderNumber: z.string().min(3, "กรุณากรอกเลขออเดอร์"),
  purchaseAmount: z
    .string()
    .min(1, "กรุณากรอกยอดซื้อ")
    .transform(Number)
    .pipe(z.number().positive("ยอดซื้อต้องมากกว่า 0")),
  campaignId: z.string().optional(),
});

type OrderForm = z.infer<typeof orderSchema>;

type TabKey = "order" | "receipt";

interface SubmitResult {
  message: string;
  pointsEarned?: number;
  newBalance?: number;
  pending?: boolean;
}

export default function SubmitPage() {
  const [tab, setTab] = useState<TabKey>("order");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: campaignData } = useSWR("campaigns", getCampaigns);
  const campaigns: Campaign[] = campaignData?.campaigns ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrderForm>({ resolver: zodResolver(orderSchema) });

  async function onSubmitOrder(data: OrderForm) {
    setResult(null);
    try {
      const res = await submitOrder({
        channel: data.channel,
        orderNumber: data.orderNumber,
        purchaseAmount: data.purchaseAmount,
        campaignId: data.campaignId || undefined,
      });
      setResult({
        message: "ส่งออเดอร์สำเร็จ!",
        pointsEarned: res.pointsEarned,
        newBalance: res.newBalance,
      });
      reset();
    } catch (e) {
      setResult({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", pending: true });
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setUploadError(null);
    setResult(null);
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("กรุณาเลือกไฟล์สลิป");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("receipt", file);
      form.append("channel", "MANUAL");
      const res = await uploadReceipt(form);
      if (res.autoApproved) {
        setResult({
          message: "ระบบตรวจสอบอัตโนมัติสำเร็จ!",
          pointsEarned: res.pointsEarned,
          newBalance: res.newBalance,
        });
      } else {
        setResult({
          message: "ส่งสลิปสำเร็จ ระบบกำลังตรวจสอบ",
          pending: true,
        });
      }
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-gray-800">ส่งออเดอร์รับแต้ม</h1>

      {/* Tabs */}
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
        {(["order", "receipt"] as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setResult(null); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === t ? "bg-white text-line-green shadow-sm" : "text-gray-500"
            }`}
          >
            {t === "order" ? (
              <><Hash className="h-4 w-4" /> กรอกเลขออเดอร์</>
            ) : (
              <><Upload className="h-4 w-4" /> อัปโหลดสลิป</>
            )}
          </button>
        ))}
      </div>

      {/* Result Banner */}
      {result && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
            result.pending
              ? "bg-yellow-50 text-yellow-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {result.pending ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div>
            <p className="font-medium">{result.message}</p>
            {result.pointsEarned != null && (
              <p>+{result.pointsEarned.toLocaleString("th-TH")} คะแนน</p>
            )}
            {result.newBalance != null && (
              <p className="text-xs opacity-75">
                คะแนนคงเหลือ {result.newBalance.toLocaleString("th-TH")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Order Number Tab */}
      {tab === "order" && (
        <form onSubmit={handleSubmit(onSubmitOrder)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ช่องทาง *</label>
            <select {...register("channel")} className="input-field">
              <option value="">เลือกช่องทาง</option>
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {errors.channel && (
              <p className="mt-1 text-xs text-red-500">{errors.channel.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">เลขออเดอร์ *</label>
            <input
              {...register("orderNumber")}
              className="input-field"
              placeholder="เช่น 240501ABCDEF"
            />
            {errors.orderNumber && (
              <p className="mt-1 text-xs text-red-500">{errors.orderNumber.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ยอดซื้อ (บาท) *</label>
            <input
              {...register("purchaseAmount")}
              type="number"
              min="1"
              step="0.01"
              className="input-field"
              placeholder="0.00"
            />
            {errors.purchaseAmount && (
              <p className="mt-1 text-xs text-red-500">{errors.purchaseAmount.message as string}</p>
            )}
          </div>

          {campaigns.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">แคมเปญ (ถ้ามี)</label>
              <select {...register("campaignId")} className="input-field">
                <option value="">ไม่เลือกแคมเปญ</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.nameTh}</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-line w-full">
            {isSubmitting ? "กำลังส่ง..." : "ส่งออเดอร์"}
          </button>
        </form>
      )}

      {/* Receipt Upload Tab */}
      {tab === "receipt" && (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white text-gray-400 transition hover:border-line-green hover:text-line-green"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="preview" className="max-h-52 rounded-lg object-contain" />
            ) : (
              <>
                <Camera className="h-10 w-10" />
                <p className="text-sm">แตะเพื่อเลือกรูปสลิป</p>
                <p className="text-xs">รองรับ JPG, PNG, WebP (สูงสุด 10MB)</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={handleFileChange}
          />

          {previewUrl && (
            <button
              type="button"
              onClick={() => {
                setPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-sm text-gray-500"
            >
              <X className="h-4 w-4" /> เลือกไฟล์ใหม่
            </button>
          )}

          {uploadError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {uploadError}
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !previewUrl}
            className="btn-line w-full disabled:opacity-50"
          >
            {uploading ? "กำลังอัปโหลด..." : "ส่งสลิป"}
          </button>
        </div>
      )}
    </div>
  );
}
