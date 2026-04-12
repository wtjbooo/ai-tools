// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import NavLinks from "./NavLinks";
import { AuthButton, AuthProvider } from "../components/auth/auth-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") || "https://www.xaira.top";

const siteHost = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "www.xaira.top";
  }
})();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "XAira - 发现真正值得使用的 AI 工具",
    template: "%s | XAira",
  },
  description:
    "收录实用 AI 工具，支持分类浏览、搜索、精选推荐与投稿提交，帮助你更快找到适合自己的 AI 工具。",
  applicationName: "XAira",
  keywords: [
    "AI工具",
    "AI工具导航",
    "AI工具目录",
    "人工智能工具",
    "AI写作工具",
    "AI绘图工具",
    "AI视频工具",
    "AI效率工具",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "XAira",
    title: "XAira - 发现真正值得使用的 AI 工具",
    description:
      "收录实用 AI 工具，支持分类浏览、搜索、精选推荐与投稿提交，帮助你更快找到适合自己的 AI 工具。",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "XAira - 发现真正值得使用的 AI 工具",
    description:
      "收录实用 AI 工具，支持分类浏览、搜索、精选推荐与投稿提交，帮助你更快找到适合自己的 AI 工具。",
  },
  category: "technology",
};

const isDev = process.env.NODE_ENV === "development";

function DevDatabaseWarning() {
  if (!isDev) return null;

  return (
    <div className="border-b border-amber-200/80 bg-amber-50/92">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs text-amber-900 sm:px-6 sm:text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
            本地开发环境
          </span>
          <span className="truncate">
            注意：当前本地项目已连接正式数据库，请谨慎进行审核、编辑、推荐、隐藏等写入操作。
          </span>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40">
      <div className="border-b border-black/6 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-2 sm:gap-3 transition-opacity hover:opacity-90"
          >
            {/* 💡 核心升级：更换为纯代码 SVG 矢量 Logo，彻底解决报错 */}
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 overflow-hidden shrink-0 items-center justify-center rounded-[14px] sm:rounded-[18px] border border-black/8 bg-gray-900 shadow-[0_8px_20px_rgba(15,23,42,0.1)]">
              <img 
                src="/logo.svg" 
                alt="Logo" 
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 hover:scale-105" 
              />
              <span className="hidden text-sm font-semibold tracking-tight text-gray-950">
                AI
              </span>
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight text-gray-950 sm:text-[15px]">
                AI 工具目录
              </div>
              <div className="hidden text-xs text-gray-500 lg:block">
                精选、克制、持续更新
              </div>
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

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm text-gray-600 transition-colors hover:text-gray-950"
    >
      {children}
    </Link>
  );
}

function Footer() {
  return (
    <footer className="mt-14 border-t border-black/8 bg-white/88">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr_0.9fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-3">
             {/* 💡 底部 Footer 同步更换真实 SVG Logo */}
            <div className="relative flex h-10 w-10 overflow-hidden items-center justify-center rounded-[18px] border border-black/8 bg-gray-900 shadow-[0_8px_20px_rgba(15,23,42,0.1)]">
              <img 
                src="/logo.svg" 
                alt="Logo" 
                className="absolute inset-0 h-full w-full object-cover" 
              />
              <span className="hidden text-sm font-semibold tracking-tight text-gray-950">
                AI
              </span>
            </div>

            <div>
              <div className="text-[15px] font-semibold tracking-tight text-gray-950">
                AI 工具目录
              </div>
              <div className="text-xs text-gray-500">精选、克制、持续更新</div>
            </div>
          </div>

          <p className="max-w-md text-sm leading-7 text-gray-600">
            收录真正值得使用的 AI 工具，也持续补充更贴近创作与效率场景的高质量入口。
          </p>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-900">快速入口</div>
          <div className="flex flex-col gap-2">
            <FooterLink href="/">首页</FooterLink>
            <FooterLink href="/featured">精选推荐</FooterLink>
            <FooterLink href="/workspace">灵感套件</FooterLink>
            <FooterLink href="/submit">提交工具</FooterLink>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-900">站点信息</div>
          <div className="space-y-2 text-sm leading-7 text-gray-600">
            <p>域名：{siteHost}</p>
            <p>内容持续更新，欢迎提交高质量 AI 工具与产品入口。</p>
          </div>
        </div>
      </div>

      <div className="border-t border-black/8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <FooterLink href="/about">关于我们</FooterLink>
            <FooterLink href="/guidelines">收录说明</FooterLink>
            <FooterLink href="/business">商务合作</FooterLink>
            <FooterLink href="/privacy">隐私政策</FooterLink>
            <FooterLink href="/terms">服务条款</FooterLink>
          </div>

          <div className="flex flex-col gap-1 text-xs text-gray-500 lg:items-end">
            <p>© 2026 AI 工具目录</p>
            <p>让发现 AI 工具更简单，也更值得。</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${inter.className} min-h-screen bg-[linear-gradient(180deg,#fafafa_0%,#f7f7f8_100%)] text-gray-900 antialiased`}
      >
        <AuthProvider>
          <DevDatabaseWarning />
          <Header />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}