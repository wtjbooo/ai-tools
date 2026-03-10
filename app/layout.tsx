import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import NavLinks from "./NavLinks";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AI 工具目录",
    template: "%s | AI 工具目录",
  },
  description: "收录实用 AI 工具，支持分类浏览、搜索和投稿提交。",
  metadataBase: new URL("https://y78bq.dpdns.org"),
};

const isDev = process.env.NODE_ENV === "development";

function DevDatabaseWarning() {
  if (!isDev) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50">
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
    <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <span className="text-sm font-semibold text-gray-900">AI</span>
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight text-gray-950 sm:text-base">
              AI 工具目录
            </div>
            <div className="hidden text-xs text-gray-500 sm:block">
              简约、高效、持续收录
            </div>
          </div>
        </Link>

        <div className="overflow-x-auto">
          <NavLinks />
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div className="space-y-3">
          <div className="text-base font-semibold tracking-tight text-gray-950">
            AI 工具目录
          </div>
          <p className="text-sm leading-7 text-gray-600">
            收录实用 AI 工具，支持分类浏览、搜索和投稿提交，帮助你更快找到适合自己的 AI 工具。
          </p>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-900">快速入口</div>
          <div className="flex flex-col gap-2 text-sm text-gray-600">
            <Link href="/" className="transition-colors hover:text-gray-950">
              首页
            </Link>
            <Link href="/search" className="transition-colors hover:text-gray-950">
              搜索工具
            </Link>
            <Link
              href="/featured"
              className="transition-colors hover:text-gray-950"
            >
              精选推荐
            </Link>
            <Link
              href="/submit"
              className="transition-colors hover:text-gray-950"
            >
              提交工具
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-900">站点信息</div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>域名：y78bq.dpdns.org</p>
            <p>内容持续更新中，欢迎提交优质 AI 工具。</p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-gray-500 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 AI 工具目录. All rights reserved.</p>
          <p>让发现 AI 工具这件事，变得更简单一点。</p>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <div className="min-h-screen">
          <DevDatabaseWarning />
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}