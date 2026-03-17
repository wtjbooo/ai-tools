import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import SearchBar from "@/components/SearchBar";
import ToolCard from "@/components/ToolCard";
import PageHero from "@/components/PageHero";
import SiteHeader from "@/components/SiteHeader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_NAME = "AI 工具目录";
const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") || "https://y78bq.dpdns.org";

const SEARCH_SUGGESTIONS = [
  "聊天助手",
  "PPT",
  "图片生成",
  "视频生成",
  "写作",
  "翻译",
];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { q?: string };
}): Promise<Metadata> {
  const q = (searchParams.q ?? "").trim();
  const canonical = `${SITE_URL}/search`;

  if (!q) {
    return {
      title: "搜索 AI 工具",
      description:
        "搜索 AI 工具、分类、标签和使用场景，快速找到适合你的 AI 工具。",
      alternates: {
        canonical,
      },
      openGraph: {
        title: "搜索 AI 工具",
        description:
          "搜索 AI 工具、分类、标签和使用场景，快速找到适合你的 AI 工具。",
        url: canonical,
        siteName: SITE_NAME,
        type: "website",
        locale: "zh_CN",
      },
      twitter: {
        card: "summary",
        title: "搜索 AI 工具",
        description:
          "搜索 AI 工具、分类、标签和使用场景，快速找到适合你的 AI 工具。",
      },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  return {
    title: `${q} 搜索结果`,
    description: `查看与“${q}”相关的 AI 工具搜索结果，快速找到对应的工具介绍、分类、标签和官网入口。`,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${q} 搜索结果`,
      description: `查看与“${q}”相关的 AI 工具搜索结果，快速找到对应的工具介绍、分类、标签和官网入口。`,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      locale: "zh_CN",
    },
    twitter: {
      card: "summary",
      title: `${q} 搜索结果`,
      description: `查看与“${q}”相关的 AI 工具搜索结果。`,
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

function SuggestionPill({ keyword }: { keyword: string }) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent(keyword)}`}
      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
    >
      {keyword}
    </Link>
  );
}

function EmptySearchState({
  title,
  description,
  keyword,
}: {
  title: string;
  description: string;
  keyword?: string;
}) {
  return (
    <div className="rounded-[22px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-7">
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
            {title}
          </h2>
          <p className="text-sm leading-7 text-gray-600 sm:text-base">
            {description}
          </p>
          {keyword ? (
            <p className="text-sm text-gray-500">
              当前关键词：<span className="font-medium text-gray-900">{keyword}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-center gap-2.5">
          {SEARCH_SUGGESTIONS.map((item) => (
            <SuggestionPill key={item} keyword={item} />
          ))}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]"
          >
            返回首页
          </Link>

          <Link
            href="/featured"
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
          >
            浏览精选推荐
          </Link>
        </div>
      </div>
    </div>
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
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <SiteHeader currentPath="/search" />

        <div className="space-y-6">
          <PageHero
            title="搜索 AI 工具"
            description="输入关键词，搜索工具名称、简介、分类和使用场景。"
            actions={
              <div className="w-full max-w-4xl">
                <SearchBar />
              </div>
            }
            breadcrumbs={[
              { label: "首页", href: "/" },
              { label: "搜索" },
            ]}
          />

          <EmptySearchState
            title="输入关键词开始搜索"
            description="你可以搜索工具名称、功能方向或使用场景，例如：聊天助手、PPT、图片生成、翻译、视频生成。"
          />
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
    include: { category: true, tags: { include: { tag: true } } },
    orderBy: [
      { featured: "desc" },
      { outClicks: "desc" },
      { views: "desc" },
      { clicks: "desc" },
      { createdAt: "desc" },
    ],
    take: 100,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <SiteHeader currentPath="/search" />

      <div className="space-y-6">
        <PageHero
          title="搜索结果"
          description={`关键词：${q} · 共 ${tools.length} 条结果`}
          actions={
            <div className="w-full max-w-4xl">
              <SearchBar defaultValue={q} />
            </div>
          }
          breadcrumbs={[
            { label: "首页", href: "/" },
            { label: "搜索" },
          ]}
        />

        {tools.length === 0 ? (
          <EmptySearchState
            title="没有找到相关工具"
            description="这个关键词暂时没有匹配结果。你可以试试更短的词、更常见的功能词，或者直接浏览精选推荐。"
            keyword={q}
          />
        ) : (
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
