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

      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <div className="space-y-3">
          <Link className="underline" href="/">
            ← 返回首页
          </Link>

          <h1 className="text-3xl font-bold">
            {category.name}
            {currentPage > 1 ? ` - 第 ${currentPage} 页` : ""}
          </h1>

          <p className="text-gray-600">
            共收录 {total} 个工具 · 当前第 {currentPage} / {totalPages} 页
          </p>
        </div>

        {tools.length === 0 ? (
          <div className="rounded-2xl border p-6 text-gray-600">
            这个分类下暂时还没有工具。
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {tools.map((tool) => {
                const showPricing =
                  tool.pricing &&
                  tool.pricing !== "unknown" &&
                  tool.pricing !== "未知";

                const logoSrc =
                  tool.logoUrl && tool.logoUrl.trim() !== ""
                    ? tool.logoUrl
                    : "/default-tool-icon.png";

                return (
                  <Link
                    key={tool.id}
                    href={`/tool/${tool.slug}`}
                    className="rounded-2xl border p-5 hover:shadow-md transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold">{tool.name}</h2>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {tool.featured ? (
                            <span className="rounded-full bg-black px-2 py-1 text-xs text-white">
                              推荐
                            </span>
                          ) : null}

                          <img
                            src={logoSrc}
                            alt={`${tool.name} logo`}
                            width={24}
                            height={24}
                            className="h-6 w-6 rounded object-cover"
                          />
                        </div>
                      </div>

                      <p className="text-sm text-gray-700">
                        {tool.description || "暂无简介"}
                      </p>

                      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                        <span className="rounded-full bg-gray-100 px-2 py-1">
                          点击 {tool.clicks}
                        </span>

                        {showPricing ? (
                          <span className="rounded-full bg-gray-100 px-2 py-1">
                            {tool.pricing}
                          </span>
                        ) : null}

                        {tool.tags.slice(0, 4).map((item) => (
                          <span
                            key={item.tag.id}
                            className="rounded-full border px-2 py-1"
                          >
                            {item.tag.name}
                          </span>
                        ))}
                      </div>

                      <span className="inline-block text-sm underline">
                        查看详情
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4">
              {currentPage > 1 ? (
                <Link
                  href={
                    currentPage - 1 === 1
                      ? `/category/${encodeURIComponent(category.slug)}`
                      : `/category/${encodeURIComponent(category.slug)}?page=${
                          currentPage - 1
                        }`
                  }
                  className="underline"
                >
                  ← 上一页
                </Link>
              ) : (
                <span />
              )}

              {currentPage < totalPages ? (
                <Link
                  href={`/category/${encodeURIComponent(category.slug)}?page=${
                    currentPage + 1
                  }`}
                  className="underline"
                >
                  下一页 →
                </Link>
              ) : (
                <span />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}