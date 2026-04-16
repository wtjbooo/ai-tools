// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import NavLinks from "./NavLinks";
import { AuthButton, AuthProvider } from "../components/auth/auth-provider";
import { Analytics } from '@vercel/analytics/react';
import { UpgradeModalProvider } from "@/contexts/UpgradeModalContext";
import SiteShell from "@/components/SiteShell"; // 🚀 引入我们刚写的控制器
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.SITE_URL?.replace(/\/+$/, "") || "https://www.xaira.top";

const siteHost = (() => {
  try { return new URL(SITE_URL).host; } catch { return "www.xaira.top"; }
})();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "XAira - 发现真正值得使用的 AI 工具",
    template: "%s | XAira",
  },
  description: "收录实用 AI 工具，帮助你更快找到适合自己的 AI 产品。",
  applicationName: "XAira",
  keywords: ["AI工具", "人工智能", "XAira"],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "XAira",
    title: "XAira - 发现真正值得使用的 AI 工具",
    locale: "zh_CN",
  },
};

function Header() {
  return (
    <header className="sticky top-0 z-40">
      <div className="border-b border-black/6 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <Link href="/" className="inline-flex shrink-0 items-center gap-2 sm:gap-3 transition-opacity hover:opacity-90">
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 overflow-hidden shrink-0 items-center justify-center rounded-[14px] sm:rounded-[18px] border border-black/8 bg-gray-900 shadow-[0_8px_20px_rgba(15,23,42,0.1)]">
              <img src="/logo.svg" alt="Logo" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight text-gray-950 sm:text-[15px]">XAira</div>
              <div className="hidden text-xs text-gray-500 lg:block">精选、克制、持续更新</div>
            </div>
          </Link>
          <div className="min-w-0 flex-1 mx-2 sm:mx-6">
            <div className="flex w-full overflow-x-auto items-center sm:justify-end scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <NavLinks />
            </div>
          </div>
          <div className="shrink-0">
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-14 border-t border-black/8 bg-white/88">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between text-sm text-gray-500">
        <div className="space-y-2">
          <div className="text-gray-950 font-semibold text-[15px]">XAira</div>
          <p>© 2026 让发现 AI 工具更简单。</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/about" className="hover:text-gray-950">关于我们</Link>
          <Link href="/privacy" className="hover:text-gray-950">隐私政策</Link>
          <Link href="/terms" className="hover:text-gray-950">服务条款</Link>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} min-h-screen bg-[#fafafa] text-gray-900 antialiased`}>
        <AuthProvider>
          <UpgradeModalProvider>
            {/* 🚀 使用 SiteShell 包裹，实现按需隐藏 Header 和 Footer */}
            <SiteShell header={<Header />} footer={<Footer />}>
              {children}
            </SiteShell>
          </UpgradeModalProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}