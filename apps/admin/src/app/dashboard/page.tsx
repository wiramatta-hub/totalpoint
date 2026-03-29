"use client";

import useSWR from "swr";
import {
  Users,
  TrendingUp,
  Star,
  ClipboardCheck,
  Megaphone,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatPoints, formatDateTime, channelLabels } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "รอตรวจสอบ", cls: "bg-yellow-100 text-yellow-700" },
    APPROVED: { label: "อนุมัติ", cls: "bg-green-100 text-green-700" },
    REJECTED: { label: "ปฏิเสธ", cls: "bg-red-100 text-red-700" },
    PROCESSING: { label: "กำลังตรวจสอบ", cls: "bg-blue-100 text-blue-700" },
  };
  const c = cfg[status] ?? { label: status, cls: "bg-gray-100 text-gray-700" };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.cls}`}>
      {c.label}
    </span>
  );
};

const StatCard = ({
  title,
  value,
  sub,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {typeof value === "number" ? value.toLocaleString("th-TH") : value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  </div>
);

const COLORS = ["#10B981", "#9CA3AF", "#F59E0B", "#8B5CF6"];

export default function DashboardPage() {
  const { data, isLoading } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const d = data?.overview ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          ข้อมูล ณ วันนี้ อัปเดตทุก 30 วินาที
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="สมาชิกทั้งหมด"
          value={d.totalMembers ?? 0}
          sub={`+${d.membersThisMonth ?? 0} เดือนนี้`}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="คะแนนสะสมทั้งหมด"
          value={d.totalPointsIssued ?? 0}
          sub={`แลกไปแล้ว ${(d.totalPointsRedeemed ?? 0).toLocaleString()}`}
          icon={Star}
          color="bg-yellow-500"
        />
        <StatCard
          title="รอตรวจสอบ"
          value={d.pendingVerifications ?? 0}
          sub={`อนุมัติวันนี้ ${d.approvedToday ?? 0} รายการ`}
          icon={ClipboardCheck}
          color="bg-orange-500"
        />
        <StatCard
          title="แคมเปญที่ใช้งาน"
          value={d.activeCampaigns ?? 0}
          sub="กำลังดำเนินการ"
          icon={Megaphone}
          color="bg-green-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Points Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            คะแนนที่แจก 14 วันล่าสุด
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.dailyPoints ?? []}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "short",
                  })
                }
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => [v.toLocaleString("th-TH"), "คะแนน"]}
              />
              <Area
                type="monotone"
                dataKey="points"
                stroke="#10B981"
                fill="#D1FAE5"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tier Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">สัดส่วน Tier</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data?.tierBreakdown ?? []}
                dataKey="_count"
                nameKey="tier.nameTh"
                cx="50%"
                cy="50%"
                outerRadius={70}
              >
                {(data?.tierBreakdown ?? []).map(
                  (_: unknown, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  )
                )}
              </Pie>
              <Legend
                iconType="circle"
                formatter={(v: string) => (
                  <span className="text-xs">{v}</span>
                )}
              />
              <Tooltip formatter={(v: number) => [v.toLocaleString(), "คน"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">หลักฐานล่าสุด</h2>
            <a
              href="/verifications"
              className="text-xs text-green-600 hover:underline"
            >
              ดูทั้งหมด →
            </a>
          </div>
          <div className="space-y-3">
            {(data?.recentSubmissions ?? []).slice(0, 6).map(
              (s: {
                id: string;
                member: { lineDisplayName: string };
                channel: string;
                purchaseAmount: number | null;
                submittedAt: string;
                status: string;
              }) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Users size={14} className="text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {s.member.lineDisplayName ?? "ผู้ใช้"}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {channelLabels[s.channel]} •{" "}
                        {s.purchaseAmount
                          ? `฿${s.purchaseAmount.toLocaleString()}`
                          : "-"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              )
            )}
          </div>
        </div>

        {/* Channel Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            ยอดซื้อตามช่องทาง (เดือนนี้)
          </h2>
          <div className="space-y-3">
            {(data?.channelStats ?? []).map(
              (c: {
                channel: string;
                _count: number;
                _sum: { purchaseAmount: number; pointsEarned: number };
              }) => (
                <div key={c.channel} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {channelLabels[c.channel] ?? c.channel}
                    </p>
                    <p className="text-xs text-gray-400">
                      {c._count} รายการ
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      ฿
                      {(c._sum?.purchaseAmount ?? 0).toLocaleString("th-TH", {
                        minimumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-xs text-green-600">
                      {(c._sum?.pointsEarned ?? 0).toLocaleString()} คะแนน
                    </p>
                  </div>
                </div>
              )
            )}
            {(!data?.channelStats || data.channelStats.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">
                ยังไม่มีข้อมูล
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
