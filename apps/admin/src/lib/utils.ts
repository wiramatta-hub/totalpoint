import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPoints(points: number) {
  return new Intl.NumberFormat("th-TH").format(points) + " คะแนน";
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateCouponCode(prefix = "TP", length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
  return `${prefix}-${code}`;
}

export const channelLabels: Record<string, string> = {
  SHOPEE: "Shopee",
  TIKTOK: "TikTok Shop",
  LAZADA: "Lazada",
  BOOTH: "งานออกบูธ",
  HOMMALL: "Hommall",
  MANUAL: "Manual",
};

export const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "รอตรวจสอบ", color: "yellow" },
  PROCESSING: { label: "กำลังตรวจสอบ", color: "blue" },
  APPROVED: { label: "อนุมัติ", color: "green" },
  REJECTED: { label: "ปฏิเสธ", color: "red" },
  CANCELLED: { label: "ยกเลิก", color: "gray" },
};

export const tierColors: Record<string, string> = {
  tier_member: "text-gray-500",
  tier_silver: "text-gray-400",
  tier_gold: "text-yellow-500",
  tier_platinum: "text-purple-500",
};
