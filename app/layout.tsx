import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import NavLinks from "./NavLinks";
import { AuthButton, AuthProvider } from "../components/auth/auth-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.SITE_URL?.replace(/\/+$/, "") || "https://y78bq.dpdns.org";

const siteHost = (() => {
  try { return new URL(SITE_URL).host; } catch { return "y78bq.dpdns.org"; }
})();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "AI 工具目录", template: "%s | AI 工具目录" },
  description: "收录实用 AI 工具，支持分类浏览、搜索、精选推荐与投稿提交，帮助你更快找到适合自己的 AI 工具。",
};

const isDev = process.env.NODE_ENV === "development";

function DevDatabaseWarning() {
  if (!isDev) return null;
  return (
    <div className="border-b border-amber-200/50 bg-amber-50/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-1.5 text-[11px] text-amber-900/80 sm:px-6">
        <span className="font-medium text-amber-900">开发环境</span> · 当前连接正式数据库，操作请谨慎。
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 w-full transition-all duration-300">
      <div className="border-b border-black/[0.04] bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2.5 active:scale-95 transition-transform">
            <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-black/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <span className="text-sm font-bold tracking-tighter text-gray-900">AI</span>
            </div>
            <div className="hidden flex-col sm:flex">
              <span className="text-[14px] font-semibold leading-none tracking-tight text-gray-950">AI 工具目录</span>
              <span className="mt-1 text-[10px] text-gray-400">精选 · 克制</span>
            </div>
          </Link>

          {/* Middle: Nav (Mobile: Horizontal Scroll / Desktop: Flex) */}
          <nav className="absolute left-1/2 -translate-x-1/2 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:translate-x-0 max-md:w-full max-md:border-t max-md:bg-white/80 max-md:px-4 max-md:py-2 md:block">
            <div className="flex items-center max-md:justify-around">
              <NavLinks />
            </div>
          </nav>

          {/* Right: Auth */}
          <div className="flex items-center">
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-black/[0.05] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:grid lg:grid-cols-3 lg:gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/5 bg-zinc-50 text-xs font-bold">AI</div>
            <span className="text-base font-semibold tracking-tight text-gray-950">AI 工具目录</span>
          </div>
          <p className="text-sm leading-relaxed text-gray-500">收录真正值得使用的 AI 工具，持续补充高质量入口。</p>
        </div>
        
        <div className="mt-10 grid grid-cols-2 gap-8 lg:col-span-2 lg:mt-0">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-950">链接</h3>
            <ul className="space-y-3">
              {["首页", "精选推荐", "反向提示词", "提交工具"].map((item) => (
                <li key={item}><Link href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{item}</Link></li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">关于</h3>
            <div className="space-y-2 text-sm text-gray-500">
              <p>域名：{siteHost}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 text-xs">
                <Link href="/privacy" className="hover:text-gray-900">隐私政策</Link>
                <Link href="/terms" className="hover:text-gray-900">服务条款</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 border-t border-black/[0.03]">
        <p className="text-[11px] text-gray-400 text-center sm:text-left">© 2026 AI 工具目录 · 让发现 AI 工具更简单</p>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className={`${inter.className} min-h-screen bg-[#FBFBFB] text-gray-900 antialiased`}>
        <AuthProvider>
          <DevDatabaseWarning />
          <Header />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}