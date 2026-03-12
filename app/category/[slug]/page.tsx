import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ToolCard from "@/components/ToolCard";
import PageHero from "@/components/PageHero";
import SiteHeader from "@/components/SiteHeader";

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
        { outClicks: "desc" },
        { views: "desc" },
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
    <div className="rounded-[22px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-7">
      <div className="mx-auto max-w-2xl space-y-4 text-center">
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
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:text-gray-950 active:scale-[0.98]"
          >
            返回首页
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
  const safePage = currentPage > totalPages ? totalPages : currentPage;

  if (currentPage !== safePage) {
    const canonicalHref =
      safePage <= 1
        ? `/category/${encodeURIComponent(category.slug)}`
        : `/category/${encodeURIComponent(category.slug)}?page=${safePage}`;

    return (
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <SiteHeader currentPath={`/category/${category.slug}`} />

        <div className="rounded-[22px] border border-gray-200 bg-white p-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-7">
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
              页面不存在
            </h1>
            <p className="text-sm leading-7 text-gray-600 sm:text-base">
              当前页码超出范围，已为你提供可访问页面入口。
            </p>
            <div>
              <Link
                href={canonicalHref}
                className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]"
              >
                前往有效页面
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pageTitle =
    safePage > 1 ? `${category.name} · 第 ${safePage} 页` : category.name;

  const canonicalUrl = getCategoryPageUrl(category.slug, safePage);

  const categoryJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} AI 工具`,
    url: canonicalUrl,
    description: `${category.name} 分类下收录了 ${total} 个 AI 工具。`,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntity: tools.map((tool) => ({
      "@type": "SoftwareApplication",
      name: tool.name,
      url: `${SITE_URL}/tool/${tool.slug}`,
      applicationCategory: category.name,
      operatingSystem: "Web",
      description: tool.description,
    })),
  };

  const prevHref =
    safePage > 1
      ? safePage - 1 === 1
        ? `/category/${encodeURIComponent(category.slug)}`
        : `/category/${encodeURIComponent(category.slug)}?page=${safePage - 1}`
      : null;

  const nextHref =
    safePage < totalPages
      ? `/category/${encodeURIComponent(category.slug)}?page=${safePage + 1}`
      : null;

  return (
    <>
      <Script
        id={`category-jsonld-${category.slug}-${safePage}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(categoryJsonLd),
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <SiteHeader currentPath={`/category/${category.slug}`} />

        <div className="space-y-6">
          <PageHero
            title={pageTitle}
            description={`当前分类共收录 ${total} 个已发布工具，帮助你快速浏览这个方向下值得关注的 AI 产品。`}
            breadcrumbs={[
              { label: "首页", href: "/" },
              { label: category.name },
            ]}
            actions={
              <>
                <Link
                  href="/featured"
                  className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
                >
                  浏览精选推荐
                </Link>

                <Link
                  href="/submit"
                  className="inline-flex items-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]"
                >
                  提交工具
                </Link>
              </>
            }
          />

          {tools.length === 0 ? (
            <EmptyCategoryState categoryName={category.name} />
          ) : (
            <>
              <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </section>

              {totalPages > 1 ? (
                <section className="flex flex-col items-center justify-between gap-4 rounded-[22px] border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:flex-row">
                  <div className="text-sm text-gray-500">
                    第 <span className="font-medium text-gray-900">{safePage}</span> /
                    <span className="font-medium text-gray-900"> {totalPages}</span> 页
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {prevHref ? <PageButton href={prevHref}>上一页</PageButton> : null}
                    {nextHref ? <PageButton href={nextHref}>下一页</PageButton> : null}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}