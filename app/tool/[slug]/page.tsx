import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ToolViewTracker from "@/components/ToolViewTracker";
import CopyLinkButton from "@/components/CopyLinkButton";

const SITE_NAME = "AI 工具目录";
const SITE_URL = "https://y78bq.dpdns.org";

async function getPublishedToolBySlug(slug: string) {
  return prisma.tool.findFirst({
    where: {
      slug,
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
  });
}

async function getRelatedTools(categoryId: string, slug: string) {
  return prisma.tool.findMany({
    where: {
      categoryId,
      isPublished: true,
      NOT: {
        slug,
      },
    },
    orderBy: [
      { featured: "desc" },
      { outClicks: "desc" },
      { views: "desc" },
      { clicks: "desc" },
      { createdAt: "desc" },
    ],
    take: 4,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const tool = await getPublishedToolBySlug(params.slug);

  if (!tool) {
    return {
      title: "工具不存在",
      description: "你访问的工具页面不存在。",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const tagNames = tool.tags.map((item) => item.tag.name).filter(Boolean);
  const categoryName = tool.category?.name || "AI 工具";
  const url = `${SITE_URL}/tool/${tool.slug}`;

  const rawDescription =
    tool.description ||
    `${tool.name} 的详细介绍、分类、标签、适用场景和官网入口。`;

  const description =
    rawDescription.length > 160
      ? `${rawDescription.slice(0, 157)}...`
      : rawDescription;

  const keywords = [
    tool.name,
    categoryName,
    ...tagNames,
    `${tool.name} 官网`,
    `${tool.name} 介绍`,
    `${tool.name} 使用场景`,
    "AI 工具",
    "AI 工具目录",
  ];

  return {
    title: `${tool.name} - ${categoryName} | ${SITE_NAME}`,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${tool.name} - ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      locale: "zh_CN",
    },
    twitter: {
      card: "summary_large_image",
      title: `${tool.name} - ${SITE_NAME}`,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

function InfoBadge({
  children,
  href,
}: {
  children: React.ReactNode;
  href?: string | null;
}) {
  const className =
    "inline-flex items-center rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return <span className={className}>{children}</span>;
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-gray-950">
        {title}
      </h2>
      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {children}
      </div>
    </section>
  );
}

export default async function ToolPage({
  params,
}: {
  params: { slug: string };
}) {
  const tool = await getPublishedToolBySlug(params.slug);

  if (!tool) {
    notFound();
  }

  const relatedTools = tool.categoryId
    ? await getRelatedTools(tool.categoryId, tool.slug)
    : [];

  const showPricing =
    tool.pricing && tool.pricing !== "unknown" && tool.pricing !== "未知";

  const showContent = tool.content && tool.content.trim() !== "";
  const tagList = tool.tags.map((item) => item.tag.name);
  const url = `${SITE_URL}/tool/${tool.slug}`;
  const categoryHref = tool.category?.slug
    ? `/category/${encodeURIComponent(tool.category.slug)}`
    : null;

  const logoSrc =
    tool.logoUrl && tool.logoUrl.trim() !== ""
      ? tool.logoUrl
      : "/default-tool-icon.png";

  const outHref = `/out/${tool.slug}`;

  const showViews = typeof tool.views === "number" && tool.views > 0;
  const showOutClicks =
    typeof tool.outClicks === "number" && tool.outClicks > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    applicationCategory: tool.category?.name || "AI Tool",
    operatingSystem: "Web",
    description:
      tool.description || `${tool.name} 的详细介绍、分类、标签和官网入口。`,
    url,
    sameAs: tool.website || undefined,
    offers: showPricing
      ? {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: tool.pricing,
        }
      : undefined,
    keywords: tagList.join(", "),
    datePublished: tool.createdAt.toISOString(),
    dateModified: tool.updatedAt.toISOString(),
  };

  return (
    <>
      <ToolViewTracker slug={tool.slug} />

      <Script
        id="tool-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="space-y-8 sm:space-y-10">
          <section className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-white px-5 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:rounded-[32px] sm:px-8 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.06),transparent_30%)]" />

            <div className="relative space-y-5 sm:space-y-6">
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:text-gray-950 active:scale-[0.98]"
              >
                ← 返回首页
              </Link>

              <div className="flex items-start justify-between gap-4 sm:gap-6">
                <div className="min-w-0 flex-1 space-y-4 sm:space-y-5">
                  <div className="space-y-3">
                    <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
                      {tool.name}
                    </h1>
                    <p className="max-w-3xl text-base leading-8 text-gray-600 sm:text-lg">
                      {tool.description || "暂无简介"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {categoryHref ? (
                      <InfoBadge href={categoryHref}>
                        主分类：{tool.category?.name || "未分类"}
                      </InfoBadge>
                    ) : (
                      <InfoBadge>主分类：{tool.category?.name || "未分类"}</InfoBadge>
                    )}

                    {showPricing ? <InfoBadge>价格：{tool.pricing}</InfoBadge> : null}

                    {showOutClicks ? (
                      <InfoBadge>官网点击：{tool.outClicks}</InfoBadge>
                    ) : null}

                    {showViews ? <InfoBadge>浏览：{tool.views}</InfoBadge> : null}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    {tool.website ? (
                      <a
                        href={outHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]"
                      >
                        访问官网
                      </a>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-5 py-3 text-sm text-gray-500">
                        暂未提供官网链接
                      </span>
                    )}

                    <CopyLinkButton url={url} />

                    <Link
                      href="/featured"
                      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
                    >
                      浏览精选工具
                    </Link>
                  </div>
                </div>

                <div className="shrink-0 pt-1">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-gray-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.05)] sm:h-20 sm:w-20 sm:rounded-[28px]">
                    <img
                      src={logoSrc}
                      alt={`${tool.name} logo`}
                      width={64}
                      height={64}
                      className="h-9 w-9 rounded-lg object-cover sm:h-12 sm:w-12 sm:rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {tagList.length > 0 ? (
            <DetailCard title="相关标签">
              <div className="flex flex-wrap gap-3">
                {tagList.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </DetailCard>
          ) : null}

          <DetailCard title="详细介绍">
            <div className="text-[15px] leading-8 text-gray-700">
              {showContent ? (
                <p className="whitespace-pre-line">{tool.content}</p>
              ) : (
                <p>
                  当前还没有更详细的介绍，后续可以补充适合人群、核心功能、优缺点、使用场景等内容。
                </p>
              )}
            </div>
          </DetailCard>

          <DetailCard title="基础信息">
            <div className="grid gap-4 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <div className="text-xs text-gray-500">收录时间</div>
                <div className="mt-1 font-medium text-gray-900">
                  {new Date(tool.createdAt).toLocaleString("zh-CN")}
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <div className="text-xs text-gray-500">最后更新</div>
                <div className="mt-1 font-medium text-gray-900">
                  {new Date(tool.updatedAt).toLocaleString("zh-CN")}
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <div className="text-xs text-gray-500">浏览</div>
                <div className="mt-1 font-medium text-gray-900">
                  {tool.views ?? 0}
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <div className="text-xs text-gray-500">官网点击</div>
                <div className="mt-1 font-medium text-gray-900">
                  {tool.outClicks ?? 0}
                </div>
              </div>
            </div>
          </DetailCard>

          {relatedTools.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                相关工具
              </h2>

              <div className="grid gap-5 md:grid-cols-2">
                {relatedTools.map((t) => {
                  const relatedLogoSrc =
                    t.logoUrl && t.logoUrl.trim() !== ""
                      ? t.logoUrl
                      : "/default-tool-icon.png";

                  return (
                    <Link
                      key={t.id}
                      href={`/tool/${t.slug}`}
                      className="group block rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.015] hover:border-gray-300 hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)] active:scale-[0.995]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-lg font-semibold tracking-tight text-gray-950 transition-colors duration-300 group-hover:text-black">
                            {t.name}
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                            {t.description ?? "暂无简介"}
                          </p>
                          <span className="mt-3 inline-block text-sm text-gray-700 underline underline-offset-4 transition-colors duration-300 group-hover:text-gray-950">
                            查看详情 →
                          </span>
                        </div>

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-gray-100 transition-all duration-300 group-hover:bg-white group-hover:ring-gray-200">
                          <img
                            src={relatedLogoSrc}
                            alt={`${t.name} logo`}
                            width={24}
                            height={24}
                            className="h-6 w-6 rounded object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}