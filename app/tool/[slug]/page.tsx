import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
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

function isWeakText(text?: string | null) {
  if (!text) return true;
  const value = text.trim();
  if (!value) return true;

  const weakPatterns = [
    /这里写/i,
    /待补充/i,
    /后续补充/i,
    /测试/i,
    /演示/i,
    /暂无简介/i,
  ];

  return weakPatterns.some((pattern) => pattern.test(value));
}

function normalizeDescription(
  toolName: string,
  categoryName: string,
  description?: string | null,
) {
  const fallback = `${toolName} 是一款归类在「${categoryName}」方向的 AI 工具，这里整理了它的定位、基础信息、标签与官网入口，方便你快速判断是否值得继续体验。`;

  const value = isWeakText(description) ? fallback : description!.trim();
  return truncateText(value, 160);
}

function buildKeywords(
  toolName: string,
  categoryName: string,
  tagNames: string[],
) {
  return Array.from(
    new Set(
      [
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
      ].filter(Boolean),
    ),
  );
}

function getPricingText(pricing?: string | null) {
  if (!pricing) return null;
  const value = pricing.trim();
  if (!value || value === "unknown" || value === "未知") return null;
  return value;
}

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("zh-CN");
}

function formatDateTime(value: Date) {
  return new Date(value).toLocaleString("zh-CN");
}

// 优化后的标签 Badge，增加毛玻璃质感
function InfoBadge({
  children,
  href,
}: {
  children: ReactNode;
  href?: string | null;
}) {
  const className =
    "inline-flex items-center rounded-full border border-zinc-200/60 bg-white/80 backdrop-blur-md px-3.5 py-1.5 text-[13px] font-medium text-zinc-700 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-zinc-950";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return <span className={className}>{children}</span>;
}

// 优化后的内容卡片，边框更柔和，背景更干净
function DetailCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900">
          {title}
        </h2>
        {description ? (
          <p className="text-[14px] leading-6 text-zinc-500">{description}</p>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-black/[0.04] bg-white p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] sm:p-8">
        {children}
      </div>
    </section>
  );
}

// 优化后的数据展示卡片
function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[20px] border border-black/[0.03] bg-zinc-50/50 px-4 py-4 transition-colors hover:bg-zinc-50">
      <div className="text-[12px] font-medium text-zinc-500">{label}</div>
      <div className="mt-1.5 text-[18px] font-semibold tracking-tight text-zinc-900">
        {value}
      </div>
    </div>
  );
}

function SoftList({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item}
          className="rounded-[20px] border border-black/[0.03] bg-zinc-50/80 px-5 py-4 text-[14px] leading-7 text-zinc-700"
        >
          {item}
        </div>
      ))}
    </div>
  );
}

// 优化后的关联工具链接，引入了和首页卡片一致的阻尼悬浮特效
function RelatedToolLink({
  name,
  slug,
  description,
  logoUrl,
}: {
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
}) {
  const relatedLogoSrc =
    logoUrl && logoUrl.trim() !== "" ? logoUrl : "/default-tool-icon.png";

  return (
    <Link
      href={`/tool/${slug}`}
      className="group block rounded-[24px] border border-black/[0.04] bg-white p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:border-black/[0.08] hover:shadow-[0_14px_30px_-6px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-zinc-50 ring-1 ring-black/[0.04] transition-transform duration-500 group-hover:scale-105 group-hover:bg-white">
          <img
            src={relatedLogoSrc}
            alt={`${name} logo`}
            width={24}
            height={24}
            className="h-6 w-6 rounded-md object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="truncate text-[15px] font-semibold text-zinc-900 transition-colors group-hover:text-black">
            {name}
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-zinc-500">
            {isWeakText(description)
              ? "查看这款同类 AI 工具的定位与详情。"
              : description}
          </p>
          <span className="mt-2.5 inline-flex items-center text-[12px] font-medium text-zinc-400 transition-colors group-hover:text-zinc-900">
            查看详情 <span className="ml-1 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function splitContentToParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !isWeakText(item));
}

function buildUseCases(
  name: string,
  categoryName: string,
  tagList: string[],
  pricingText: string | null,
) {
  const items = [
    `想快速判断 ${name} 是否适合自己当前工作流的人`,
    `需要在「${categoryName}」场景中提升效率或生成质量的个人用户与团队`,
  ];

  if (tagList.length > 0) {
    items.push(`关注 ${tagList.slice(0, 3).join("、")} 等能力方向的用户`);
  }

  if (pricingText) {
    items.push(`希望先结合价格方式与能力定位，再决定是否深入试用的人`);
  }

  return items.slice(0, 4);
}

function buildFallbackParagraphs(
  name: string,
  categoryName: string,
  tagList: string[],
  pricingText: string | null,
) {
  const tagText =
    tagList.length > 0 ? `，并与 ${tagList.slice(0, 3).join("、")} 等标签相关` : "";

  const pricingSentence = pricingText
    ? `当前页面也整理了它的价格方式：${pricingText}。`
    : "当前页面整理了它的分类、标签和访问入口，方便快速判断是否值得继续了解。";

  return [
    `${name} 是一款归类在「${categoryName}」方向的 AI 工具${tagText}。如果你正在寻找这一类产品，这个页面可以先帮你快速了解它的大致定位。`,
    pricingSentence,
  ];
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
  const description = normalizeDescription(
    tool.name,
    categoryName,
    tool.description,
  );

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
  const tagList = tool.tags.map((item) => item.tag.name).filter(Boolean);
  const categoryName = tool.category?.name || "AI 工具";
  const categoryHref = tool.category?.slug
    ? `/category/${encodeURIComponent(tool.category.slug)}`
    : null;
  const url = `${SITE_URL}/tool/${tool.slug}`;
  const outHref = `/out/${tool.slug}`;
  const secondaryHref = categoryHref || "/featured";
  const secondaryLabel = categoryHref ? `更多 ${categoryName}` : "浏览精选工具";

  const normalizedDescription = normalizeDescription(
    tool.name,
    categoryName,
    tool.description,
  );

  const paragraphs = tool.content?.trim()
    ? splitContentToParagraphs(tool.content)
    : [];

  const finalParagraphs =
    paragraphs.length > 0
      ? paragraphs
      : buildFallbackParagraphs(tool.name, categoryName, tagList, pricingText);

  const useCases = buildUseCases(
    tool.name,
    categoryName,
    tagList,
    pricingText,
  );

  const logoSrc =
    tool.logoUrl && tool.logoUrl.trim() !== ""
      ? tool.logoUrl
      : "/default-tool-icon.png";

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    applicationCategory: categoryName,
    operatingSystem: "Web",
    description: normalizedDescription,
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

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="space-y-8">
          {/* 优化后的头部 (Hero Section) */}
          <section className="relative overflow-hidden rounded-[32px] border border-black/[0.04] bg-white px-6 py-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.06),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.04),transparent_40%)]" />

            <div className="relative space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full border border-black/[0.06] bg-white px-4 py-2 text-[13px] font-medium text-zinc-600 transition hover:-translate-y-0.5 hover:border-black/[0.1] hover:text-zinc-900 shadow-sm"
                >
                  ← 返回首页
                </Link>

                {categoryHref ? (
                  <Link
                    href={categoryHref}
                    className="inline-flex items-center rounded-full border border-transparent px-3 py-2 text-[13px] font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    {categoryName}
                  </Link>
                ) : null}
              </div>

              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),280px] lg:items-start pt-2">
                <div className="min-w-0 space-y-5">
                  <div className="space-y-3">
                    <h1 className="text-[36px] font-bold tracking-tight text-zinc-900 sm:text-[48px] sm:leading-[1.08]">
                      {tool.name}
                    </h1>

                    <p className="max-w-3xl text-[16px] leading-relaxed text-zinc-500 sm:text-[18px]">
                      {normalizedDescription}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <InfoBadge href={categoryHref}>主分类：{categoryName}</InfoBadge>
                    {pricingText ? <InfoBadge>价格：{pricingText}</InfoBadge> : null}
                    {tagList.slice(0, 3).map((tag) => (
                      <InfoBadge key={tag}>{tag}</InfoBadge>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    {tool.website ? (
                      <a
                        href={outHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full bg-zinc-900 px-6 py-3 text-[14px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] active:scale-[0.98]"
                      >
                        访问官网体验
                      </a>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-6 py-3 text-[14px] font-medium text-zinc-400">
                        暂未提供官网
                      </span>
                    )}

                    <CopyLinkButton url={url} />

                    <Link
                      href={secondaryHref}
                      className="inline-flex items-center rounded-full border border-zinc-200/80 bg-white px-6 py-3 text-[14px] font-medium text-zinc-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
                    >
                      {secondaryLabel}
                    </Link>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* 右侧大 Logo 面板，增加呼吸感 */}
                  <div className="rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-4">
                      <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px] border border-black/[0.04] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.02]">
                        <img
                          src={logoSrc}
                          alt={`${tool.name} logo`}
                          width={64}
                          height={64}
                          className="h-12 w-12 rounded-[12px] object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[18px] font-bold text-zinc-900">
                          {tool.name}
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-zinc-500">
                          {categoryName}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="总计浏览" value={tool.views ?? 0} />
                    <StatCard label="前往官网" value={tool.outClicks ?? 0} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 核心改动：给 aside 增加 sticky 悬浮效果 */}
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr),320px]">
            <div className="space-y-8">
              <DetailCard
                title="产品简介"
                description="先快速了解这款工具的大致定位与核心能力。"
              >
                <div className="space-y-5 text-[15px] leading-loose text-zinc-700">
                  {finalParagraphs.map((paragraph, index) => (
                    <p key={`${tool.id}-paragraph-${index}`}>{paragraph}</p>
                  ))}
                </div>
              </DetailCard>

              <DetailCard
                title="适合人群与场景"
                description="看看这款产品是否契合你的日常工作流。"
              >
                <SoftList items={useCases} />
              </DetailCard>

              {tagList.length > 0 ? (
                <DetailCard
                  title="功能标签"
                  description="通过标签快速掌握产品的亮点。"
                >
                  <div className="flex flex-wrap gap-2.5">
                    {tagList.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-black/[0.05] bg-zinc-50 px-3.5 py-1.5 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </DetailCard>
              ) : null}

              <DetailCard
                title="公开信息档案"
                description="收录信息、更新时间与数据库档案。"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-[20px] bg-zinc-50/80 px-4 py-4">
                    <div className="text-[12px] font-medium text-zinc-500">分类</div>
                    <div className="mt-1 text-[15px] font-semibold text-zinc-900">
                      {categoryName}
                    </div>
                  </div>

                  <div className="rounded-[20px] bg-zinc-50/80 px-4 py-4">
                    <div className="text-[12px] font-medium text-zinc-500">定价模式</div>
                    <div className="mt-1 text-[15px] font-semibold text-zinc-900">
                      {pricingText || "未标注"}
                    </div>
                  </div>

                  <div className="rounded-[20px] bg-zinc-50/80 px-4 py-4">
                    <div className="text-[12px] font-medium text-zinc-500">平台收录日期</div>
                    <div className="mt-1 text-[15px] font-semibold text-zinc-900">
                      {formatDate(tool.createdAt)}
                    </div>
                  </div>

                  <div className="rounded-[20px] bg-zinc-50/80 px-4 py-4">
                    <div className="text-[12px] font-medium text-zinc-500">最后更新信息</div>
                    <div className="mt-1 text-[15px] font-semibold text-zinc-900">
                      {formatDate(tool.updatedAt)}
                    </div>
                  </div>
                </div>
              </DetailCard>
            </div>

            {/* 🔥 这里是重点：sticky top-24 self-start 让面板悬浮跟随 */}
            <aside className="space-y-6 sticky top-24 self-start">
              <DetailCard
                title="准备出发"
                description="直接点击前往体验这款产品的魅力。"
              >
                <div className="space-y-4">
                  {tool.website ? (
                    <a
                      href={outHref}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center rounded-[20px] bg-zinc-900 px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_14px_30px_rgba(0,0,0,0.2)] active:scale-[0.98]"
                    >
                      直达官网体验
                    </a>
                  ) : (
                    <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-center text-sm font-medium text-zinc-400">
                      暂未提供官网链接
                    </div>
                  )}

                  <CopyLinkButton url={url} />

                  <div className="rounded-[20px] border border-blue-100/50 bg-blue-50/40 p-4 text-[13px] leading-6 text-blue-900/70">
                    如果你觉得这款工具不适合，可以继续在下方浏览我们为你推荐的替代方案。
                  </div>
                </div>
              </DetailCard>

              {relatedTools.length > 0 ? (
                <section className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-[18px] font-semibold tracking-tight text-zinc-900">
                      替代方案推荐
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {relatedTools.map((t) => (
                      <RelatedToolLink
                        key={t.id}
                        name={t.name}
                        slug={t.slug}
                        description={t.description}
                        logoUrl={t.logoUrl}
                      />
                    ))}
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