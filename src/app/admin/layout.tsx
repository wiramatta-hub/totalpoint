import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin | Hommall Rewards",
};

const NAV = [
  { href: "/admin", label: "ให้คะแนน", icon: "🎯" },
  { href: "/admin/members", label: "สมาชิก", icon: "👥" },
  { href: "/admin/transactions", label: "ประวัติ", icon: "📋" },
  { href: "/admin/rewards", label: "ของรางวัล", icon: "🎁" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 flex items-center h-14">
          <Link href="/admin" className="text-lg font-bold text-[#06C755] mr-8">
            🏠 Hommall Admin
          </Link>
          <nav className="flex gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#06C755] hover:bg-green-50 rounded-lg whitespace-nowrap transition-colors"
              >
                {n.icon} {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
