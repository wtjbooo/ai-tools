import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { prisma } from "@/lib/db";
import ToolCard from "@/components/ToolCard";
import PageHero from "@/components/PageHero";
import SiteHeader from "@/components/SiteHeader";

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

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <SiteHeader currentPath="/featured" />

        <div className="space-y-5 sm:space-y-6">
          <PageHero
            title="精选推荐"
            description={`这里展示站长精选推荐的 AI 工具，按推荐顺序排列。适合从高质量、优先推荐的工具开始逛。当前共收录 ${tools.length} 个${currentCategory ? `「${currentCategory.name}」` : ""}精选推荐工具${!currentCategory ? `（总计 ${totalFeaturedCount} 个）` : ""}`}
            breadcrumbs={[
              { label: "首页", href: "/" },
              { label: "精选推荐" },
            ]}
          />

          {categories.length > 0 ? (
            <section className="space-y-3">
              <div className="flex flex-wrap gap-2.5">
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
            <div className="rounded-[22px] border border-gray-200 bg-white p-5 text-gray-600 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              这个筛选条件下暂时还没有精选推荐工具。
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
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