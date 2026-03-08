import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_NAME = "AI 工具导航";
const SITE_URL = "https://y78bq.dpdns.org";

export const metadata: Metadata = {
  title: `精选推荐 AI 工具 | ${SITE_NAME}`,
  description: "查看站长精选推荐的 AI 工具，按推荐顺序展示高质量 AI 产品与实用工具。",
  alternates: {
    canonical: `${SITE_URL}/featured`,
  },
  openGraph: {
    title: `精选推荐 AI 工具 | ${SITE_NAME}`,
    description: "查看站长精选推荐的 AI 工具，按推荐顺序展示高质量 AI 产品与实用工具。",
    url: `${SITE_URL}/featured`,
    siteName: SITE_NAME,
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: `精选推荐 AI 工具 | ${SITE_NAME}`,
    description: "查看站长精选推荐的 AI 工具，按推荐顺序展示高质量 AI 产品与实用工具。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

async function getFeaturedTools(categorySlug?: string) {
  return prisma.tool.findMany({
    where: {
      isPublished: true,
      featured: true,
      ...(categorySlug
        ? {
            category: {
              slug: categorySlug,
            },
          }
        : {}),
    },
    include: {
      category: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: [{ featuredOrder: "asc" }, { createdAt: "desc" }],
  });
}

async function getFeaturedCategories() {
  const categories = await prisma.category.findMany({
    where: {
      tools: {
        some: {
          isPublished: true,
          featured: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      tools: {
        where: {
          isPublished: true,
          featured: true,
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      tools: {
        _count: "desc",
      },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    count: category.tools.length,
  }));
}

function ToolCard({ tool }: any) {
  const showPricing =
    tool.pricing && tool.pricing !== "unknown" && tool.pricing !== "未知";

  const tags = tool.tags.map((item: any) => item.tag.name).slice(0, 4);

  const logoSrc =
    tool.logoUrl && tool.logoUrl.trim() !== ""
      ? tool.logoUrl
      : "/default-tool-icon.png";

  return (
    <Link
      href={`/tool/${tool.slug}`}
      className="block rounded-2xl border bg-white p-4 transition hover:shadow-md"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="text-lg font-semibold">{tool.name}</div>
            <div className="text-sm text-gray-600">
              {tool.category?.name ?? "未分类"}
            </div>
          </div>

          <img
            src={logoSrc}
            alt={`${tool.name} logo`}
            width={24}
            height={24}
            className="h-6 w-6 shrink-0 rounded object-cover"
          />
        </div>

        <p className="line-clamp-3 text-sm text-gray-700">
          {tool.description || "暂无简介"}
        </p>

        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="rounded-full bg-gray-100 px-2 py-1">
            推荐顺序 {tool.featuredOrder ?? 0}
          </span>

          {tool.clicks > 0 ? (
            <span className="rounded-full bg-gray-100 px-2 py-1">
              点击 {tool.clicks}
            </span>
          ) : null}

          {showPricing ? (
            <span className="rounded-full bg-gray-100 px-2 py-1">
              {tool.pricing}
            </span>
          ) : null}

          {tags.map((tag: string) => (
            <span key={tag} className="rounded-full border px-2 py-1">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default async function FeaturedPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const selectedCategorySlug = String(searchParams?.category ?? "").trim();

  const [categories, tools] = await Promise.all([
    getFeaturedCategories(),
    getFeaturedTools(selectedCategorySlug || undefined),
  ]);

  const currentCategory = categories.find(
    (category) => category.slug === selectedCategorySlug
  );

  const totalFeaturedCount = categories.reduce(
    (sum, category) => sum + category.count,
    0
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: currentCategory
      ? `${currentCategory.name} 精选推荐 AI 工具`
      : "精选推荐 AI 工具",
    description: currentCategory
      ? `查看 ${currentCategory.name} 分类下的精选推荐 AI 工具，按推荐顺序展示。`
      : "查看站长精选推荐的 AI 工具，按推荐顺序展示高质量 AI 产品与实用工具。",
    url: currentCategory
      ? `${SITE_URL}/featured?category=${encodeURIComponent(currentCategory.slug)}`
      : `${SITE_URL}/featured`,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: tools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}/tool/${tool.slug}`,
        name: tool.name,
      })),
    },
  };

  return (
    <>
      <Script
        id="featured-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div className="space-y-3">
          <Link href="/" className="text-sm underline">
            ← 返回首页
          </Link>

          <h1 className="text-3xl font-bold">精选推荐</h1>
          <p className="text-gray-600">
            这里展示站长精选推荐的 AI 工具，按推荐顺序排列。适合从高质量、优先推荐的工具开始逛。
          </p>

          <div className="text-sm text-gray-500">
            当前共收录 {tools.length} 个
            {currentCategory ? `「${currentCategory.name}」` : ""}精选推荐工具
            {!currentCategory ? `（总计 ${totalFeaturedCount} 个）` : ""}
          </div>
        </div>

        {categories.length > 0 ? (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/featured"
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  !selectedCategorySlug ? "bg-black text-white" : "hover:bg-gray-100"
                }`}
              >
                全部（{totalFeaturedCount}）
              </Link>

              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/featured?category=${encodeURIComponent(category.slug)}`}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    selectedCategorySlug === category.slug
                      ? "bg-black text-white"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {category.name}（{category.count}）
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {tools.length === 0 ? (
          <div className="rounded-2xl border p-6 text-gray-600">
            这个筛选条件下暂时还没有精选推荐工具。
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}