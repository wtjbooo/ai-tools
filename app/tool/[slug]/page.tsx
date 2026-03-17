import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ToolViewTracker from "@/components/ToolViewTracker";
import CopyLinkButton from "@/components/CopyLinkButton";

const SITE_NAME = "AI 工具目录";
const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") || "https://y78bq.dpdns.org";

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

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function normalizeDescription(toolName: string, description?: string | null) {
  const fallback = `${toolName} 的详细介绍、适用场景、分类标签和官网入口。`;
  return truncateText((description || fallback).trim(), 160);
}

function buildKeywords(
  toolName: string,
  categoryName: string,
  tagNames: string[]
) {
  return Array.from(
    new Set([
      toolName,
      categoryName,
      ...tagNames,
      `${toolName} 官网`,
      `${toolName} 介绍`,
      `${toolName} 怎么样`,
      `${toolName} 使用场景`,
      "AI 工具",
      "AI 工具目录",
      "AI工具导航",
    ].filter(Boolean))
  );
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
  const description = normalizeDescription(tool.name, tool.description);

  return {
    title: `${tool.name} - ${categoryName}`,
    description,
    keywords: buildKeywords(tool.name, categoryName, tagNames),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${tool.name} - ${categoryName}`,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      locale: "zh_CN",
    },
    twitter: {
      card: "summary_large_image",
      title: `${tool.name} - ${categoryName}`,
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
    "inline-flex items-center rounded-full border border-black/10 bg-white/88 px-3.5 py-1.5 text-sm text-gray-700 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-black/15 hover:bg-white";

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
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-[22px] font-semibold tracking-tight text-gray-950">
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-6 text-gray-500">{description}</p>
        ) : null}
      </div>

      <div className="rounded-[30px] border border-black/8 bg-white/92 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur-md sm:p-7">
        {children}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[24px] border border-black/8 bg-white/88 px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-md">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
        {value}
      </div>
    </div>
  );
}

function SoftSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-gray-950">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-[22px] border border-black/8 bg-white/80 px-4 py-4 text-sm leading-7 text-gray-700"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function splitContentToParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildUseCases(name: string, categoryName: string, tagList: string[]) {
  const base = [
    `想快速判断 ${name} 是否适合自己工作流的人`,
    `希望在「${categoryName}」场景里提升效率的个人用户或团队`,
    `想先看定位与能力，再决定是否访问官网深入试用的人`,
  ];

  if (tagList.length > 0) {
    base.push(`关注 ${tagList.slice(0, 3).join("、")} 等能力方向的用户`);
  }

  return base;
}

function buildHighlights(name: string, categoryName: string, hasContent: boolean) {
  const base = [
    `${name} 已按目录站统一结构整理，方便快速判断定位与价值`,
    `页面内可直接查看分类、标签、统计信息与官网入口`,
    `在 ${categoryName} 类工具里，可结合相关推荐继续横向对比`,
  ];

  if (!hasContent) {
    base.push("当前详细介绍仍可继续补充，后续适合增加核心功能、适用人群与典型场景");
  }

  return base;
}

function getPricingText(pricing?: string | null) {
  if (!pricing) return null;
  const value = pricing.trim();
  if (!value || value === "unknown" || value === "未知") return null;
  return value;
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

  const pricingText = getPricingText(tool.pricing);
  const showContent = Boolean(tool.content?.trim());
  const tagList = tool.tags.map((item) => item.tag.name).filter(Boolean);
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

  const categoryName = tool.category?.name || "AI 工具";
  const paragraphs = showContent ? splitContentToParagraphs(tool.content || "") : [];
  const useCases = buildUseCases(tool.name, categoryName, tagList);
  const highlights = buildHighlights(tool.name, categoryName, showContent);
  const metaDescription = normalizeDescription(tool.name, tool.description);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    applicationCategory: categoryName,
    operatingSystem: "Web",
    description: metaDescription,
    url,
    sameAs: tool.website || undefined,
    keywords: tagList.join(", "),
    datePublished: tool.createdAt.toISOString(),
    dateModified: tool.updatedAt.toISOString(),
  };

  if (pricingText) {
    jsonLd.offers = {
      "@type": "Offer",
      description: pricingText,
      availability: "https://schema.org/InStock",
    };
  }

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

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          <section className="relative overflow-hidden rounded-[30px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] px-5 py-6 shadow-[0_20px_64px_rgba(15,23,42,0.075)] sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),transparent_42%)]" />
              <div className="absolute -top-16 right-[-8%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.16),transparent_68%)] blur-2xl" />
              <div className="absolute bottom-[-80px] left-[-4%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.10),transparent_70%)] blur-2xl" />
            </div>

            <div className="relative space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full border border-black/10 bg-white/88 px-4 py-2 text-sm text-gray-700 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-black/15 hover:text-gray-950"
                >
                  ← 返回首页
                </Link>

                {categoryHref ? (
                  <Link
                    href={categoryHref}
                    className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm text-gray-600 backdrop-blur-md transition-all duration-200 hover:border-black/15 hover:bg-white/90 hover:text-gray-950"
                  >
                    {categoryName}
                  </Link>
                ) : null}
              </div>

              <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr),300px] lg:items-start">
                <div className="min-w-0 space-y-5">
                  <div className="space-y-3">
                    <div className="inline-flex items-center rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-medium tracking-[0.18em] text-gray-500 backdrop-blur-md">
                      AI TOOL PROFILE
                    </div>

                    <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl sm:leading-[1.04]">
                      {tool.name}
                    </h1>

                    <p className="max-w-3xl text-base leading-8 text-gray-600 sm:text-lg">
                      {tool.description || "暂无简介"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <InfoBadge href={categoryHref}>
                      主分类：{tool.category?.name || "未分类"}
                    </InfoBadge>

                    {pricingText ? <InfoBadge>价格：{pricingText}</InfoBadge> : null}

                    {showOutClicks ? (
                      <InfoBadge>官网点击：{tool.outClicks}</InfoBadge>
                    ) : null}

                    {showViews ? <InfoBadge>浏览：{tool.views}</InfoBadge> : null}

                    {!showViews && !showOutClicks ? (
                      <InfoBadge>已收录工具详情页</InfoBadge>
                    ) : null}
                  </div>

                  {tagList.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {tagList.slice(0, 8).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border border-black/8 bg-white/70 px-3 py-1.5 text-xs text-gray-600 backdrop-blur-md"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3 pt-1">
                    {tool.website ? (
                      <a
                        href={outHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.22)] active:scale-[0.98]"
                      >
                        访问官网
                      </a>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-black/8 bg-gray-50 px-5 py-3 text-sm text-gray-500">
                        暂未提供官网链接
                      </span>
                    )}

                    <CopyLinkButton url={url} />

                    <Link
                      href="/featured"
                      className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm text-gray-700 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-black/15 hover:bg-white hover:text-gray-950"
                    >
                      浏览精选工具
                    </Link>
                  </div>

                  {tool.website ? (
                    <p className="text-sm leading-7 text-gray-500">
                      点击“访问官网”后将跳转到官方站点，同时记录一次官网点击数据。
                    </p>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="rounded-[28px] border border-white/60 bg-white/74 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-black/8 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
                        <img
                          src={logoSrc}
                          alt={`${tool.name} logo`}
                          width={64}
                          height={64}
                          className="h-12 w-12 rounded-2xl object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold text-gray-950">
                          {tool.name}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {categoryName}
                        </div>
                        <div className="mt-2 text-xs text-gray-400">
                          收录时间：{new Date(tool.createdAt).toLocaleDateString("zh-CN")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="浏览" value={tool.views ?? 0} />
                    <StatCard label="官网点击" value={tool.outClicks ?? 0} />
                    <StatCard
                      label="更新时间"
                      value={new Date(tool.updatedAt).toLocaleDateString("zh-CN")}
                    />
                    <StatCard
                      label="状态"
                      value={tool.isPublished ? "已发布" : "未发布"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr),340px]">
            <div className="space-y-8">
              <DetailCard
                title="工具介绍"
                description="先快速了解这款工具的定位、特点和适合场景。"
              >
                <div className="space-y-6 text-[15px] leading-8 text-gray-700">
                  {paragraphs.length > 0 ? (
                    paragraphs.map((paragraph, index) => (
                      <p key={`${tool.id}-paragraph-${index}`}>{paragraph}</p>
                    ))
                  ) : (
                    <>
                      <p>
                        {tool.name} 是一款归类在「{categoryName}」方向的 AI 工具，当前页面已经整理了它的基础信息、标签、官网入口以及相关推荐，方便你快速判断它是否值得进一步体验。
                      </p>
                      <p>
                        如果你正在寻找同类工具，可以先结合它的分类、标签和相关工具做横向对比；如果你已经对它有明确需求，也可以直接通过官网入口继续试用或了解更多功能。
                      </p>
                    </>
                  )}
                </div>
              </DetailCard>

              <DetailCard
                title="适合谁用"
                description="不做夸张包装，只告诉你这类工具通常适合哪些人。"
              >
                <SoftSection title="适用人群" items={useCases} />
              </DetailCard>

              <DetailCard
                title="为什么值得关注"
                description="用更结构化的方式，帮你更快判断是否要点进官网。"
              >
                <SoftSection title="亮点概览" items={highlights} />
              </DetailCard>

              {tagList.length > 0 ? (
                <DetailCard
                  title="相关标签"
                  description="这些标签可以帮助你更快理解能力边界与定位。"
                >
                  <div className="flex flex-wrap gap-3">
                    {tagList.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-black/8 bg-white px-3.5 py-1.5 text-sm text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </DetailCard>
              ) : null}

              <DetailCard
                title="基础信息"
                description="收录信息、更新时间与公开统计数据。"
              >
                <div className="grid gap-4 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-[24px] bg-gray-50/90 px-4 py-4">
                    <div className="text-xs text-gray-500">收录时间</div>
                    <div className="mt-1 font-medium text-gray-900">
                      {new Date(tool.createdAt).toLocaleString("zh-CN")}
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-gray-50/90 px-4 py-4">
                    <div className="text-xs text-gray-500">最后更新</div>
                    <div className="mt-1 font-medium text-gray-900">
                      {new Date(tool.updatedAt).toLocaleString("zh-CN")}
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-gray-50/90 px-4 py-4">
                    <div className="text-xs text-gray-500">浏览</div>
                    <div className="mt-1 font-medium text-gray-900">
                      {tool.views ?? 0}
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-gray-50/90 px-4 py-4">
                    <div className="text-xs text-gray-500">官网点击</div>
                    <div className="mt-1 font-medium text-gray-900">
                      {tool.outClicks ?? 0}
                    </div>
                  </div>
                </div>
              </DetailCard>
            </div>

            <aside className="space-y-6">
              <DetailCard
                title="访问引导"
                description="已经了解得差不多时，可以直接继续下一步。"
              >
                <div className="space-y-4">
                  {tool.website ? (
                    <a
                      href={outHref}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center rounded-[22px] bg-black px-5 py-3.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.22)] active:scale-[0.98]"
                    >
                      前往官网体验
                    </a>
                  ) : (
                    <div className="rounded-[22px] border border-black/8 bg-gray-50 px-4 py-3 text-center text-sm text-gray-500">
                      暂未提供官网链接
                    </div>
                  )}

                  <CopyLinkButton url={url} />

                  <div className="rounded-[22px] border border-black/8 bg-gray-50/80 p-4 text-sm leading-7 text-gray-600">
                    如果你正在对比同类 AI 工具，建议先结合本页的分类、标签与相关推荐继续看 2 到 3 个相近产品，再决定是否深入试用。
                  </div>
                </div>
              </DetailCard>

              {relatedTools.length > 0 ? (
                <section className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-[22px] font-semibold tracking-tight text-gray-950">
                      相关工具
                    </h2>
                    <p className="text-sm leading-6 text-gray-500">
                      同分类下继续浏览，通常更容易找到替代方案或更适合自己的工具。
                    </p>
                  </div>

                  <div className="space-y-3">
                    {relatedTools.map((t) => {
                      const relatedLogoSrc =
                        t.logoUrl && t.logoUrl.trim() !== ""
                          ? t.logoUrl
                          : "/default-tool-icon.png";

                      return (
                        <Link
                          key={t.id}
                          href={`/tool/${t.slug}`}
                          className="group block rounded-[24px] border border-black/8 bg-white/92 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-black/12 hover:shadow-[0_20px_44px_rgba(15,23,42,0.08)]"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gray-50 ring-1 ring-black/5 transition-all duration-300 group-hover:bg-white">
                              <img
                                src={relatedLogoSrc}
                                alt={`${t.name} logo`}
                                width={24}
                                height={24}
                                className="h-6 w-6 rounded object-cover"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-base font-semibold text-gray-950">
                                {t.name}
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600">
                                {t.description ?? "暂无简介"}
                              </p>
                              <span className="mt-2 inline-block text-sm text-gray-700 underline underline-offset-4">
                                查看详情 →
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}