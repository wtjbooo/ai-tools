import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_NAME = "AI 工具目录";
const SITE_URL = "https://y78bq.dpdns.org";

async function getCategoryWithTools(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
  });

  if (!category) return null;

  const tools = await prisma.tool.findMany({
    where: {
      categoryId: category.id,
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
    orderBy: [{ featured: "desc" }, { clicks: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return { category, tools };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug);
  const data = await getCategoryWithTools(slug);

  if (!data) {
    return {
      title: "分类不存在",
      description: "你访问的分类页面不存在。",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { category, tools } = data;
  const url = `${SITE_URL}/category/${encodeURIComponent(category.slug)}`;

  const description = `${category.name} 分类下收录了 ${tools.length} 个 AI 工具，包含工具介绍、标签、价格信息和官网入口。`;

  return {
    title: `${category.name} AI 工具推荐 | ${SITE_NAME}`,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${category.name} AI 工具推荐 | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "zh_CN",
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} AI 工具推荐 | ${SITE_NAME}`,
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
}: {
  params: { slug: string };
}) {
  const slug = decodeURIComponent(params.slug);
  const data = await getCategoryWithTools(slug);

  if (!data) {
    notFound();
  }

  const { category, tools } = data;
  const url = `${SITE_URL}/category/${encodeURIComponent(category.slug)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} AI 工具推荐`,
    description: `${category.name} 分类下收录了 ${tools.length} 个 AI 工具，包含工具介绍、标签、价格信息和官网入口。`,
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
        position: index + 1,
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
          <h1 className="text-3xl font-bold">{category.name}</h1>
          <p className="text-gray-600">共收录 {tools.length} 个工具</p>
        </div>

        {tools.length === 0 ? (
          <div className="rounded-2xl border p-6 text-gray-600">
            这个分类下暂时还没有工具。
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tools.map((tool) => {
              const showPricing =
                tool.pricing &&
                tool.pricing !== "unknown" &&
                tool.pricing !== "未知";

              return (
                <Link
                  key={tool.id}
                  href={`/tool/${tool.slug}`}
                  className="rounded-2xl border p-5 hover:shadow-md transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold">{tool.name}</h2>
                      {tool.featured ? (
                        <span className="rounded-full bg-black px-2 py-1 text-xs text-white">
                          推荐
                        </span>
                      ) : null}
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
        )}
      </div>
    </>
  );
}