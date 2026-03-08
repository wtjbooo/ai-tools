import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

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

async function getRelatedTools(categoryId: number, slug: string) {
  return prisma.tool.findMany({
    where: {
      categoryId,
      isPublished: true,
      NOT: {
        slug,
      },
    },
    orderBy: [{ featured: "desc" }, { clicks: "desc" }, { createdAt: "desc" }],
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
    tool.pricing &&
    tool.pricing !== "unknown" &&
    tool.pricing !== "未知";

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
      <Script
        id="tool-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        <div className="space-y-4">
          <Link href="/" className="text-sm underline">
            ← 返回首页
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-4">
              <h1 className="text-3xl font-bold">{tool.name}</h1>

              <div className="flex flex-wrap gap-2 text-sm">
                {categoryHref ? (
                  <Link
                    href={categoryHref}
                    className="rounded-full bg-gray-100 px-3 py-1 hover:bg-gray-200"
                  >
                    主分类：{tool.category?.name || "未分类"}
                  </Link>
                ) : (
                  <span className="rounded-full bg-gray-100 px-3 py-1">
                    主分类：{tool.category?.name || "未分类"}
                  </span>
                )}

                {showPricing ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1">
                    价格：{tool.pricing}
                  </span>
                ) : null}

                {tool.clicks > 0 ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1">
                    点击：{tool.clicks}
                  </span>
                ) : null}
              </div>

              <p className="text-lg text-gray-700">
                {tool.description || "暂无简介"}
              </p>
            </div>

            <img
              src={logoSrc}
              alt={`${tool.name} logo`}
              width={56}
              height={56}
              className="h-14 w-14 rounded-xl border object-cover shrink-0 bg-white"
            />
          </div>
        </div>

        {tagList.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">相关标签</h2>
            <div className="flex flex-wrap gap-2">
              {tagList.map((tag) => (
                <span key={tag} className="rounded-full border px-3 py-1 text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">官网入口</h2>
          {tool.website ? (
            <a
              href={tool.website}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-xl bg-black px-4 py-2 text-white"
            >
              访问官网
            </a>
          ) : (
            <p className="text-gray-600">暂未提供官网链接</p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">详细介绍</h2>
          <div className="rounded-2xl border p-5 text-gray-700 leading-7">
            {showContent ? (
              <p className="whitespace-pre-line">{tool.content}</p>
            ) : (
              <p>
                当前还没有更详细的介绍，后续可以补充适合人群、核心功能、优缺点、使用场景等内容。
              </p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">基础信息</h2>
          <div className="rounded-2xl border p-5 text-sm text-gray-700 space-y-2">
            <p>收录时间：{new Date(tool.createdAt).toLocaleString("zh-CN")}</p>
            <p>最后更新：{new Date(tool.updatedAt).toLocaleString("zh-CN")}</p>
            <p>Slug：{tool.slug}</p>
          </div>
        </section>

        {relatedTools.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">相关工具</h2>

            <div className="grid gap-3 md:grid-cols-2">
              {relatedTools.map((t) => {
                const relatedLogoSrc =
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
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {t.description ?? "暂无简介"}
                        </p>
                      </div>

                      <img
                        src={relatedLogoSrc}
                        alt={`${t.name} logo`}
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded object-cover shrink-0"
                      />
                    </div>

                    <span className="mt-2 inline-block text-sm underline">
                      查看详情 →
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}