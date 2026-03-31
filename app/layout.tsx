import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import NavLinks from "./NavLinks";
import { AuthButton, AuthProvider } from "@/components/auth/auth-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.SITE_URL?.replace(/\\/+$/, "") || "https://y78bq.dpdns.org";

const siteHost = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "y78bq.dpdns.org";
  }
})();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI 工具目录",
    template: "%s | AI 工具目录",
  },
  description: "收录实用 AI 工具，支持分类浏览、搜索、精选推荐与投稿提交。",
};

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
      {children}
    </Link>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} min-h-screen bg-[#FBFBFB] antialiased text-zinc-900`}>
        <AuthProvider>
          <header className="sticky top-0 z-50 w-full border-b border-black/5 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2 group">
                  <div className="h-8 w-8 rounded-xl bg-zinc-900 flex items-center justify-center transition-transform group-hover:scale-105">
                    <span className="text-white font-bold text-lg">A</span>
                  </div>
                  <span className="text-lg font-semibold tracking-tight">AI 目录</span>
                </Link>
                <nav className="hidden md:block">
                  <NavLinks />
                </nav>
              </div>

              <div className="flex items-center gap-4">
                <AuthButton />
              </div>
            </div>
          </header>

          <main>{children}</main>

          <footer className="mt-20 border-t border-black/5 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="text-sm font-semibold text-gray-900">站点信息</div>
                  <div className="space-y-2 text-sm leading-7 text-gray-600">
                    <p>域名：{siteHost}</p>
                    <p>内容持续更新，欢迎提交高质量 AI 工具与产品入口。</p>
                  </div>
                </div>
              </div>
              <div className="mt-12 border-t border-black/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <FooterLink href="/about">关于我们</FooterLink>
                  <FooterLink href="/privacy">隐私政策</FooterLink>
                  <FooterLink href="/terms">服务条款</FooterLink>
                </div>
                <p className="text-xs text-gray-400">© 2026 AI 工具目录</p>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}