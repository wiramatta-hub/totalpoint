"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Upload, Gift, History, User } from "lucide-react";

const NAV = [
  { href: "/", label: "หน้าหลัก", icon: Home },
  { href: "/submit", label: "ส่งออเดอร์", icon: Upload },
  { href: "/rewards", label: "ของรางวัล", icon: Gift },
  { href: "/history", label: "ประวัติ", icon: History },
  { href: "/profile", label: "โปรไฟล์", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe">
      <div className="grid grid-cols-5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 py-2 text-xs"
            >
              <Icon
                size={22}
                className={active ? "text-line-green" : "text-gray-400"}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span className={active ? "font-semibold text-line-green" : "text-gray-400"}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
