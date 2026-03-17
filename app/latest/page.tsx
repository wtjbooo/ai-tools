import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import ToolCard from "@/components/ToolCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") || "https://y78bq.dpdns.org";

export const metadata: Metadata = {
  title: "最新收录 - AI工具导航",
  description:
    "查看最近加入目录的新工具，快速了解最近更新了哪些 AI 工具内容。",
  alternates: {
    canonical: `${SITE_URL}/latest`,
  },
  openGraph: {
    title: "最新收录 - AI工具导航",
    description:
      "查看最近加入目录的新工具，快速了解最近更新了哪些 AI 工具内容。",
    url: `${SITE_URL}/latest`,
    siteName: "AI 工具导航",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "最新收录 - AI工具导航",
    description:
      "查看最近加入目录的新工具，快速了解最近更新了哪些 AI 工具内容。",
  },
};

async function getLatestTools() {
  return prisma.tool.findMany({
    where: {
      isPublished: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 60,
    include: {
      category: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

async function getLatestToolsCount() {
  return prisma.tool.count({
    where: {
      isPublished: true,
    },
  });
}

export default async function LatestPage() {
  const [tools, total] = await Promise.all([
    getLatestTools(),
    getLatestToolsCount(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-10">
        <section className="relative overflow-hidden rounded-[30px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-6 py-10 shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.10),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.08),transparent_26%)]" />

          <div className="relative max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center rounded-full border border-black/8 bg-white/72 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-500 backdrop-blur-md">
                Latest Tools
              </div>
              <div className="inline-flex items-center rounded-full border border-black/8 bg-white/72 px-3 py-1 text-xs text-gray-500 backdrop-blur-md">
                当前共展示 {tools.length} / {total} 个工具
              </div>
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              最新收录
            </h1>

            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">
              查看最近加入目录的新工具，快速了解这段时间新增了哪些值得关注的 AI 工具。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]"
              >
                返回首页
              </Link>
              <Link
                href="/featured"
                className="inline-flex items-center rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-black/12 hover:bg-white hover:text-gray-950 active:scale-[0.98]"
              >
                浏览精选推荐
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-[26px] font-semibold tracking-tight text-gray-950 sm:text-[30px]">
                最新工具列表
              </h2>
              <p className="text-sm leading-6 text-gray-500">
                当前页面最多展示前 60 个已发布工具，按收录时间倒序排序。
              </p>
            </div>

            <Link
              href="/popular"
              className="text-sm text-gray-600 underline underline-offset-4 transition-colors hover:text-gray-950"
            >
              查看热门工具
            </Link>
          </div>

          {tools.length === 0 ? (
            <div className="rounded-[22px] border border-black/8 bg-white/92 p-5 text-gray-500 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              暂无最新收录工具
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}