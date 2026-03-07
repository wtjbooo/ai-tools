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

  if (!q) {
    return {
      title: `搜索 AI 工具 | ${SITE_NAME}`,
      description: "搜索 AI 工具、分类、标签和使用场景，快速找到适合你的 AI 工具。",
      alternates: {
        canonical: `${SITE_URL}/search`,
      },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const canonical = `${SITE_URL}/search?q=${encodeURIComponent(q)}`;

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

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();

  if (!q) {
    return (
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        <h1 className="text-3xl font-bold">搜索</h1>
        <SearchBar />
        <p className="text-gray-600">请输入关键词开始搜索。</p>
        <Link className="underline" href="/">
          ← 返回首页
        </Link>
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
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">搜索结果</h1>
        <p className="text-gray-600">
          关键词：<code>{q}</code> · 共 {tools.length} 条
        </p>
      </div>

      <SearchBar defaultValue={q} />

      {tools.length === 0 ? (
        <div className="rounded-xl border p-6 text-gray-600">
          没找到相关工具。换个关键词试试（如：PPT、图片、翻译、写作）。
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tools.map((t) => {
            const logoSrc =
              t.logoUrl && t.logoUrl.trim() !== ""
                ? t.logoUrl
                : "/default-tool-icon.png";

            return (
              <Link
                key={t.id}
                href={`/tool/${t.slug}`}
                className="block rounded-xl border bg-white p-4 transition hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{t.name}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {t.category?.name ?? "未分类"} · 点击 {t.clicks ?? 0} · 价格{" "}
                      {t.pricing ?? "未知"}
                    </div>
                  </div>

                  <img
                    src={logoSrc}
                    alt={`${t.name} logo`}
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded object-cover shrink-0"
                  />
                </div>

                <p className="mt-2 text-sm text-gray-700">
                  {t.description ?? "暂无简介"}
                </p>

                <span className="mt-3 inline-block text-sm underline">
                  查看详情 →
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <Link className="block underline" href="/">
        ← 返回首页
      </Link>
    </div>
  );
}