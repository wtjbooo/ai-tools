import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_NAME = "AI 工具目录";
const SITE_URL = "https://y78bq.dpdns.org";
const PAGE_SIZE = 20;

async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
  });
}

async function getCategoryTools(categoryId: string, page: number) {
  const skip = (page - 1) * PAGE_SIZE;

  const [total, tools] = await Promise.all([
    prisma.tool.count({
      where: {
        categoryId,
        isPublished: true,
      },
    }),
    prisma.tool.findMany({
      where: {
        categoryId,
        isPublished: true,
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
        { featured: "desc" },
        { clicks: "desc" },
        { createdAt: "desc" },
      ],
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  return { total, tools };
}

function getPageFromSearchParams(page?: string) {
  const pageNumber = Number(page);

  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    return 1;
  }

  return Math.floor(pageNumber);
}

function getCategoryPageUrl(slug: string, page: number) {
  const encodedSlug = encodeURIComponent(slug);

  if (page <= 1) {
    return `${SITE_URL}/category/${encodedSlug}`;
  }

  return `${SITE_URL}/category/${encodedSlug}?page=${page}`;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string };
}): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug);
  const currentPage = getPageFromSearchParams(searchParams.page);

  const category = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: "分类不存在",
      description: "你访问的分类页面不存在。",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { total } = await getCategoryTools(category.id, currentPage);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = currentPage > totalPages ? totalPages : currentPage;
  const url = getCategoryPageUrl(category.slug, safePage);

  const pageText = safePage > 1 ? ` - 第 ${safePage} 页` : "";
  const description = `${category.name} 分类下收录了 ${total} 个 AI 工具${
    safePage > 1 ? `，当前为第 ${safePage} 页` : ""
  }，包含工具介绍、标签、价格信息和官网入口。`;

  return {
    title: `${category.name} AI 工具推荐${pageText} | ${SITE_NAME}`,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${category.name} AI 工具推荐${pageText} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "zh_CN",
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} AI 工具推荐${pageText} | ${SITE_NAME}`,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
    keywords: [
      category.name,
      category.slug,
      `${category.name} AI 工具`,
      `${category.name} 工具推荐`,
      `${category.name} 工具目录`,
      "AI 工具",
      "AI 工具目录",
    ],
  };
}

function ToolCard({ tool }: { tool: any }) {
  const showPricing =
    tool.pricing && tool.pricing !== "unknown" && tool.pricing !== "未知";

  const logoSrc =
    tool.logoUrl && tool.logoUrl.trim() !== ""
      ? tool.logoUrl
      : "/default-tool-icon.png";

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

          <div className="flex items-center gap-2 shrink-0">
            {tool.featured ? (
              <span className="rounded-full bg-black px-2.5 py-1 text-xs text-white">
                推荐
              </span>
            ) : null}

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-gray-100 transition-all duration-300 group-hover:bg-white group-hover:ring-gray-200">
              <img
                src={logoSrc}
                alt={`${tool.name} logo`}
                width={24}
                height={24}
                className="h-6 w-6 rounded object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </div>
        </div>

        <p className="line-clamp-3 min-h-[60px] text-sm leading-6 text-gray-600">
          {tool.description || "暂无简介"}
        </p>

        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:bg-gray-200/70">
            点击 {tool.clicks}
          </span>

          {showPricing ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:bg-gray-200/70">
              {tool.pricing}
            </span>
          ) : null}

          {tool.tags.slice(0, 4).map((item: any) => (
            <span
              key={item.tag.id}
              className="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:border-gray-300"
            >
              {item.tag.name}
            </span>
          ))}
        </div>

        <span className="inline-block text-sm text-gray-700 underline underline-offset-4 transition-colors duration-300 group-hover:text-gray-950">
          查看详情 →
        </span>
      </div>
    </Link>
  );
}

function PageButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

function EmptyCategoryState({ categoryName }: { categoryName: string }) {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
      <div className="mx-auto max-w-2xl space-y-5 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
            这个分类暂时还没有工具
          </h2>
          <p className="text-sm leading-7 text-gray-600 sm:text-base">
            当前分类：
            <span className="font-medium text-gray-900"> {categoryName} </span>
            还没有已发布的工具。你可以先去浏览精选推荐，或者返回首页看看其他方向。
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/featured"
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]"
          >
            浏览精选推荐
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
          >
            返回首页
          </Link>

          <Link
            href="/submit"
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
          >
            提交工具
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string };
}) {
  const slug = decodeURIComponent(params.slug);
  const currentPage = getPageFromSearchParams(searchParams.page);

  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const { total, tools } = await getCategoryTools(category.id, currentPage);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (currentPage > totalPages && total > 0) {
    notFound();
  }

  const url = getCategoryPageUrl(category.slug, currentPage);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name:
      currentPage > 1
        ? `${category.name} AI 工具推荐 - 第 ${currentPage} 页`
        : `${category.name} AI 工具推荐`,
    description: `${category.name} 分类下收录了 ${total} 个 AI 工具，包含工具介绍、标签、价格信息和官网入口。`,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: tools.map((tool, index) => ({
        "@type": "ListItem",
        position: (currentPage - 1) * PAGE_SIZE + index + 1,
        url: `${SITE_URL}/tool/${tool.slug}`,
        name: tool.name,
      })),
    },
  };

  return (
    <>
      <Script
        id="category-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

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
                  {category.name}
                  {currentPage > 1 ? ` - 第 ${currentPage} 页` : ""}
                </h1>

                <p className="text-sm leading-7 text-gray-600 sm:text-base">
                  共收录 {total} 个工具 · 当前第 {currentPage} / {totalPages} 页
                </p>
              </div>
            </div>
          </section>

          {tools.length === 0 ? (
            <EmptyCategoryState categoryName={category.name} />
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                {currentPage > 1 ? (
                  <PageButton
                    href={
                      currentPage - 1 === 1
                        ? `/category/${encodeURIComponent(category.slug)}`
                        : `/category/${encodeURIComponent(category.slug)}?page=${
                            currentPage - 1
                          }`
                    }
                  >
                    ← 上一页
                  </PageButton>
                ) : (
                  <span />
                )}

                {currentPage < totalPages ? (
                  <PageButton
                    href={`/category/${encodeURIComponent(category.slug)}?page=${
                      currentPage + 1
                    }`}
                  >
                    下一页 →
                  </PageButton>
                ) : (
                  <span />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}