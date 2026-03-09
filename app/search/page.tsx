import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import SearchBar from "@/components/SearchBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_NAME = "AI 工具目录";
const SITE_URL = "https://y78bq.dpdns.org";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { q?: string };
}): Promise<Metadata> {
  const q = (searchParams.q ?? "").trim();

  const canonical = `${SITE_URL}/search`;

  if (!q) {
    return {
      title: `搜索 AI 工具 | ${SITE_NAME}`,
      description: "搜索 AI 工具、分类、标签和使用场景，快速找到适合你的 AI 工具。",
      alternates: {
        canonical,
      },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  return {
    title: `${q} 搜索结果 | ${SITE_NAME}`,
    description: `查看与“${q}”相关的 AI 工具搜索结果，快速找到对应的工具介绍、分类、标签和官网入口。`,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${q} 搜索结果 | ${SITE_NAME}`,
      description: `查看与“${q}”相关的 AI 工具搜索结果。`,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      locale: "zh_CN",
    },
    twitter: {
      card: "summary",
      title: `${q} 搜索结果 | ${SITE_NAME}`,
      description: `查看与“${q}”相关的 AI 工具搜索结果。`,
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

function ToolCard({ tool }: { tool: any }) {
  const logoSrc =
    tool.logoUrl && tool.logoUrl.trim() !== ""
      ? tool.logoUrl
      : "/default-tool-icon.png";

  const showPricing =
    tool.pricing && tool.pricing !== "unknown" && tool.pricing !== "未知";

  return (
    <Link
      href={`/tool/${tool.slug}`}
      className="group block rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.015] hover:border-gray-300 hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)] active:scale-[0.995]"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-lg font-semibold tracking-tight text-gray-950 transition-colors duration-300 group-hover:text-black">
              {tool.name}
            </h2>
            <div className="text-sm text-gray-500">
              {tool.category?.name ?? "未分类"}
            </div>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-gray-100 transition-all duration-300 group-hover:bg-white group-hover:ring-gray-200">
            <img
              src={logoSrc}
              alt={`${tool.name} logo`}
              width={24}
              height={24}
              className="h-6 w-6 rounded object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>

        <p className="line-clamp-3 min-h-[60px] text-sm leading-6 text-gray-600">
          {tool.description ?? "暂无简介"}
        </p>

        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:bg-gray-200/70">
            点击 {tool.clicks ?? 0}
          </span>

          {showPricing ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:bg-gray-200/70">
              {tool.pricing}
            </span>
          ) : null}
        </div>

        <span className="inline-block text-sm text-gray-700 underline underline-offset-4 transition-colors duration-300 group-hover:text-gray-950">
          查看详情 →
        </span>
      </div>
    </Link>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();

  if (!q) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-8">
          <section className="relative overflow-hidden rounded-[32px] border border-gray-200 bg-white px-6 py-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:px-8 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.06),transparent_30%)]" />

            <div className="relative space-y-4">
              <Link
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:text-gray-950 active:scale-[0.98]"
                href="/"
              >
                ← 返回首页
              </Link>

              <div className="space-y-2">
                <h1 className="text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
                  搜索 AI 工具
                </h1>
                <p className="text-sm leading-7 text-gray-600 sm:text-base">
                  输入关键词，搜索工具名称、简介、分类和使用场景。
                </p>
              </div>

              <div className="max-w-4xl">
                <SearchBar />
              </div>
            </div>
          </section>

          <div className="rounded-[24px] border border-gray-200 bg-white p-6 text-gray-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            请输入关键词开始搜索，例如：PPT、图片、翻译、写作、视频生成。
          </div>
        </div>
      </div>
    );
  }

  const tools = await prisma.tool.findMany({
    where: {
      isPublished: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { searchText: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: { category: true },
    orderBy: [{ featured: "desc" }, { clicks: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[32px] border border-gray-200 bg-white px-6 py-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.06),transparent_30%)]" />

          <div className="relative space-y-4">
            <Link
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:text-gray-950 active:scale-[0.98]"
              href="/"
            >
              ← 返回首页
            </Link>

            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
                搜索结果
              </h1>
              <p className="text-sm leading-7 text-gray-600 sm:text-base">
                关键词：<span className="font-medium text-gray-900">{q}</span> · 共{" "}
                {tools.length} 条结果
              </p>
            </div>

            <div className="max-w-4xl">
              <SearchBar defaultValue={q} />
            </div>
          </div>
        </section>

        {tools.length === 0 ? (
          <div className="rounded-[24px] border border-gray-200 bg-white p-6 text-gray-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            没找到相关工具。换个关键词试试，例如：PPT、图片、翻译、写作、视频生成。
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}