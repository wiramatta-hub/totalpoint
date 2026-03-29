"use client";

import { useState } from "react";
import useSWRInfinite from "swr/infinite";
import { getPointHistory, type PointEntry } from "@/lib/api";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";

const POINT_TYPE_LABELS: Record<string, string> = {
  EARN_ORDER: "ซื้อสินค้า",
  EARN_BOOTH: "งานออกบูธ",
  EARN_BIRTHDAY: "รางวัลวันเกิด",
  EARN_ACTIVITY: "กิจกรรม",
  EARN_MANUAL: "ปรับโดยแอดมิน",
  REDEEM_REWARD: "แลกของรางวัล",
  REDEEM_COUPON: "ใช้คูปอง",
  EXPIRE: "หมดอายุ",
  ADMIN_ADJUST: "ปรับโดยแอดมิน",
  REVERSAL: "คืนคะแนน",
};

function PointRow({ entry }: { entry: PointEntry }) {
  const isEarn = entry.points > 0;
  const label = POINT_TYPE_LABELS[entry.type] ?? entry.type;
  const date = new Date(entry.createdAt);
  const dateStr = date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
  const timeStr = date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-center gap-3 py-3.5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isEarn ? "bg-green-50" : "bg-red-50"
        }`}
      >
        {isEarn ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium text-gray-800">{label}</p>
        {entry.description && (
          <p className="truncate text-xs text-gray-400">{entry.description}</p>
        )}
        <p className="text-xs text-gray-400">
          {dateStr} · {timeStr}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-semibold ${
            isEarn ? "text-green-600" : "text-red-500"
          }`}
        >
          {isEarn ? "+" : ""}
          {entry.points.toLocaleString("th-TH")}
        </p>
        <p className="text-xs text-gray-400">
          {entry.balanceAfter.toLocaleString("th-TH")}
        </p>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { data, isLoading, size, setSize } = useSWRInfinite(
    (pageIdx) => ["history", pageIdx + 1],
    ([, page]) => getPointHistory(page as number)
  );

  const allEntries: PointEntry[] = data?.flatMap((d) => d.history) ?? [];
  const lastPage = data?.[data.length - 1];
  const hasMore =
    lastPage && lastPage.pagination.page < lastPage.pagination.pages;

  if (isLoading && allEntries.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-gray-800">ประวัติคะแนน</h1>

      {allEntries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
          <TrendingUp className="h-14 w-14" />
          <p>ยังไม่มีประวัติคะแนน</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="divide-y divide-gray-100 px-4">
            {allEntries.map((entry) => (
              <PointRow key={entry.id} entry={entry} />
            ))}
          </div>
          {hasMore && (
            <div className="p-4">
              <button
                onClick={() => setSize(size + 1)}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "โหลดเพิ่มเติม"
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
