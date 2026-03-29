"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-context";
import { updateProfile } from "@/lib/api";
import { CheckCircle, AlertCircle } from "lucide-react";

const schema = z.object({
  firstName: z.string().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  phone: z
    .string()
    .regex(/^0\d{8,9}$/, "รูปแบบเบอร์โทรไม่ถูกต้อง")
    .optional()
    .or(z.literal("")),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const { member, refreshMember } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: member?.firstName ?? "",
      lastName: member?.lastName ?? "",
      phone: member?.phone ?? "",
      email: member?.email ?? "",
      birthDate: member?.birthDate ? member.birthDate.slice(0, 10) : "",
    },
  });

  async function onSubmit(data: FormData) {
    setSaved(false);
    setSaveError(null);
    try {
      await updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        email: data.email || undefined,
        birthDate: data.birthDate || undefined,
      });
      await refreshMember();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  }

  if (!member) return null;

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-gray-800">โปรไฟล์ของฉัน</h1>

      {/* Avatar + stats */}
      <div className="mb-6 flex items-center gap-4">
        {member.linePictureUrl ? (
          <img
            src={member.linePictureUrl}
            alt="avatar"
            className="h-16 w-16 rounded-full object-cover ring-2 ring-line-green/30"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-line-green/10 text-2xl font-bold text-line-green">
            {member.lineDisplayName?.[0] ?? "?"}
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-800">
            {member.lineDisplayName ?? "—"}
          </p>
          <p className="text-sm text-gray-500">
            สมาชิกระดับ{" "}
            <span className="font-medium text-line-green">{member.tier.nameTh}</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            สะสมแต้มรวม {member.lifetimePoints.toLocaleString("th-TH")} คะแนน
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* First / Last name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ชื่อ *</label>
            <input
              {...register("firstName")}
              className="input-field"
              placeholder="ชื่อ"
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">นามสกุล *</label>
            <input
              {...register("lastName")}
              className="input-field"
              placeholder="นามสกุล"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
          <input
            {...register("phone")}
            type="tel"
            className="input-field"
            placeholder="0812345678"
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">อีเมล</label>
          <input
            {...register("email")}
            type="email"
            className="input-field"
            placeholder="example@email.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">วันเกิด</label>
          <input
            {...register("birthDate")}
            type="date"
            className="input-field"
          />
          <p className="mt-1 text-xs text-gray-400">
            ใช้รับคะแนนพิเศษวันเกิด (ตั้งได้ครั้งเดียว)
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            บันทึกข้อมูลสำเร็จ
          </div>
        )}
        {saveError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {saveError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-line w-full"
        >
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
        </button>
      </form>
    </div>
  );
}
