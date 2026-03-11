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
    orderBy: [
      { featuredOrder: "asc" },
      { outClicks: "desc" },
      { views: "desc" },
      { clicks: "desc" },
      { createdAt: "desc" },
    ],
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

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center rounded-full border px-4 py-2 text-sm transition-all duration-200 active:scale-[0.98]",
        active
          ? "border-black bg-black text-white"
          : "border-gray-200 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function ToolCard({ tool }: any) {
  const showPricing =
    tool.pricing && tool.pricing !== "unknown" && tool.pricing !== "未知";

  const tags = tool.tags.map((item: any) => item.tag.name).slice(0, 4);

  const logoSrc =
    tool.logoUrl && tool.logoUrl.trim() !== ""
      ? tool.logoUrl
      : "/default-tool-icon.png";

  const showOutClicks = typeof tool.outClicks === "number" && tool.outClicks > 0;
  const showViews = typeof tool.views === "number" && tool.views > 0;

  return (
    <Link
      href={`/tool/${tool.slug}`}
      className="group block rounded-[22px] border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.015] hover:border-gray-300 hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)] active:scale-[0.995] sm:rounded-[24px] sm:p-5"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="truncate text-base font-semibold tracking-tight text-gray-950 transition-colors duration-300 group-hover:text-black sm:text-lg">
              {tool.name}
            </div>
            <div className="text-sm text-gray-500">
              {tool.category?.name ?? "未分类"}
            </div>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-gray-100 transition-all duration-300 group-hover:bg-white group-hover:ring-gray-200 sm:h-10 sm:w-10">
            <img
              src={logoSrc}
              alt={`${tool.name} logo`}
              width={24}
              height={24}
              className="h-5 w-5 rounded object-cover transition-transform duration-300 group-hover:scale-105 sm:h-6 sm:w-6"
            />
          </div>
        </div>

        <p className="line-clamp-3 min-h-[54px] text-sm leading-6 text-gray-600 sm:min-h-[60px]">
          {tool.description || "暂无简介"}
        </p>

        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:bg-gray-200/70">
            推荐顺序 {tool.featuredOrder ?? 0}
          </span>

          {showOutClicks ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:bg-gray-200/70">
              官网点击 {tool.outClicks}
            </span>
          ) : null}

          {showViews ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:bg-gray-200/70">
              浏览 {tool.views}
            </span>
          ) : null}

          {showPricing ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:bg-gray-200/70">
              {tool.pricing}
            </span>
          ) : null}

          {tags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:border-gray-300"
            >
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

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="space-y-6 sm:space-y-8">
          <section className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-white px-5 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:rounded-[32px] sm:px-8 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.06),transparent_30%)]" />

            <div className="relative space-y-4">
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:text-gray-950 active:scale-[0.98]"
              >
                ← 返回首页
              </Link>

              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
                  精选推荐
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">
                  这里展示站长精选推荐的 AI 工具，按推荐顺序排列。适合从高质量、优先推荐的工具开始逛。
                </p>
                <div className="text-sm leading-6 text-gray-500">
                  当前共收录 {tools.length} 个
                  {currentCategory ? `「${currentCategory.name}」` : ""}精选推荐工具
                  {!currentCategory ? `（总计 ${totalFeaturedCount} 个）` : ""}
                </div>
              </div>
            </div>
          </section>

          {categories.length > 0 ? (
            <section className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <FilterPill href="/featured" active={!selectedCategorySlug}>
                  全部（{totalFeaturedCount}）
                </FilterPill>

                {categories.map((category) => (
                  <FilterPill
                    key={category.id}
                    href={`/featured?category=${encodeURIComponent(category.slug)}`}
                    active={selectedCategorySlug === category.slug}
                  >
                    {category.name}（{category.count}）
                  </FilterPill>
                ))}
              </div>
            </section>
          ) : null}

          {tools.length === 0 ? (
            <div className="rounded-[22px] border border-gray-200 bg-white p-5 text-gray-600 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:rounded-[24px] sm:p-6">
              这个筛选条件下暂时还没有精选推荐工具。
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}