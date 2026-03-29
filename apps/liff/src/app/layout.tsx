import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import LiffProvider from "@/components/liff-provider";
import BottomNav from "@/components/bottom-nav";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-noto-sans-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Total Point",
  description: "สะสมคะแนน แลกของรางวัล",
  appleWebApp: { capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={notoSansThai.variable}>
      <body className="bg-gray-50 font-sans antialiased">
        <LiffProvider>
          <main className="mx-auto min-h-screen max-w-md pb-20">
            {children}
          </main>
          <BottomNav />
        </LiffProvider>
      </body>
    </html>
  );
}
