import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import SearchBar from "@/components/SearchBar";
import ToolCard from "@/components/ToolCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") || "https://y78bq.dpdns.org";

const CATEGORY_SECTIONS_LIMIT = 4;
const CATEGORY_TOOLS_LIMIT = 6;

export const metadata: Metadata = {
  title: "AI工具导航 - 精选 AI 工具目录",
  description:
    "发现值得使用的 AI 工具，覆盖聊天、写作、绘图、视频、搜索、效率等场景，快速找到适合你的 AI 产品。",
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    title: "AI工具导航 - 精选 AI 工具目录",
    description:
      "发现值得使用的 AI 工具，覆盖聊天、写作、绘图、视频、搜索、效率等场景，快速找到适合你的 AI 产品。",
    url: `${SITE_URL}/`,
    siteName: "AI 工具目录",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI工具导航 - 精选 AI 工具目录",
    description:
      "发现值得使用的 AI 工具，覆盖聊天、写作、绘图、视频、搜索、效率等场景，快速找到适合你的 AI 产品。",
  },
};

async function getHomeData() {
  const featuredTotal = await prisma.tool.count({
    where: {
      isPublished: true,
      featured: true,
    },
  });

  const featuredCategoriesRaw = await prisma.category.findMany({
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
    take: 6,
  });

  const featuredCategories = featuredCategoriesRaw.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    count: category.tools.length,
  }));

  const manualFeaturedTools = await prisma.tool.findMany({
    where: {
      isPublished: true,
      featured: true,
    },
    include: {
      category: true,
      tags: {
        include: { tag: true },
      },
    },
    orderBy: [{ featuredOrder: "asc" }, { createdAt: "desc" }],
    take: 6,
  });

  const featuredTools =
    manualFeaturedTools.length > 0
      ? manualFeaturedTools
      : await prisma.tool.findMany({
          where: {
            isPublished: true,
          },
          include: {
            category: true,
            tags: {
              include: { tag: true },
            },
          },
          orderBy: [
            { outClicks: "desc" },
            { views: "desc" },
            { clicks: "desc" },
            { createdAt: "desc" },
          ],
          take: 6,
        });

  const featuredIds = featuredTools.map((tool) => tool.id);

  const popularTools = await prisma.tool.findMany({
    where: {
      isPublished: true,
      ...(featuredIds.length > 0
        ? {
            id: {
              notIn: featuredIds,
            },
          }
        : {}),
    },
    include: {
      category: true,
      tags: {
        include: { tag: true },
      },
    },
    orderBy: [
      { outClicks: "desc" },
      { views: "desc" },
      { clicks: "desc" },
      { createdAt: "desc" },
    ],
    take: 6,
  });

  const excludedIds = [...featuredIds, ...popularTools.map((tool) => tool.id)];

  const latestTools = await prisma.tool.findMany({
    where: {
      isPublished: true,
      ...(excludedIds.length > 0
        ? {
            id: {
              notIn: excludedIds,
            },
          }
        : {}),
    },
    include: {
      category: true,
      tags: {
        include: { tag: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 6,
  });

  const categories = await prisma.category.findMany({
    where: {
      tools: {
        some: {
          isPublished: true,
        },
      },
    },
    orderBy: {
      tools: {
        _count: "desc",
      },
    },
    take: 8,
  });

  const sectionCategoriesRaw = await prisma.category.findMany({
    where: {
      tools: {
        some: {
          isPublished: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          tools: {
            where: {
              isPublished: true,
            },
          },
        },
      },
      tools: {
        where: {
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
        take: CATEGORY_TOOLS_LIMIT,
      },
    },
    orderBy: {
      tools: {
        _count: "desc",
      },
    },
    take: CATEGORY_SECTIONS_LIMIT,
  });

  const sectionCategories = sectionCategoriesRaw.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    count: category._count.tools,
    tools: category.tools,
  }));

  return {
    featuredTools,
    featuredTotal,
    featuredCategories,
    popularTools,
    latestTools,
    categories,
    sectionCategories,
  };
}

function SectionTitle({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-[24px] font-semibold tracking-tight text-gray-950 sm:text-[28px]">
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-6 text-gray-500">{description}</p>
        ) : null}
      </div>
      {right ? <div className="text-sm">{right}</div> : null}
    </div>
  );
}

function PillLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-black/8 bg-white/88 px-4 py-2 text-sm text-gray-700 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-black/12 hover:bg-white hover:text-gray-950 active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-black/8 bg-white/92 p-5 text-gray-500 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      {text}
    </div>
  );
}

function HeroAction({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center rounded-full px-5 py-2.5 text-sm transition-all duration-200 active:scale-[0.98]",
        primary
          ? "bg-black font-medium text-white hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
          : "border border-black/8 bg-white/82 text-gray-700 backdrop-blur-md hover:-translate-y-0.5 hover:border-black/12 hover:bg-white hover:text-gray-950 hover:shadow-[0_10px_24px_rgba(15,23,42,0.05)]",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function FeatureEntryStrip() {
  return (
    <section className="mx-auto max-w-[780px]">
      <div className="flex flex-col gap-3 rounded-[18px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,250,250,0.92))] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="inline-flex items-center rounded-full border border-black/8 bg-white px-2.5 py-1 text-[10px] font-medium tracking-[0.18em] text-gray-500">
            NEW FEATURE
          </div>

          <h2 className="text-[16px] font-semibold tracking-tight text-gray-950">
            AI 反向提示词
          </h2>

          <p className="text-sm leading-6 text-gray-600">
            上传关键帧，自动生成可复用 Prompt。
          </p>
        </div>

        <Link
          href="/reverse-prompt"
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:-translate-y-0.5 hover:border-black/15 hover:bg-gray-50"
        >
          立即体验
        </Link>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const {
    featuredTools,
    featuredTotal,
    featuredCategories,
    popularTools,
    latestTools,
    categories,
    sectionCategories,
  } = await getHomeData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="space-y-7 sm:space-y-9">
        <div className="space-y-4 sm:space-y-5">
          <section className="relative overflow-hidden rounded-[30px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] px-5 py-7 shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:px-8 sm:py-9">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.08),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.06),transparent_26%)]" />

            <div className="relative mx-auto max-w-4xl space-y-5 text-center">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <div className="inline-flex items-center rounded-full border border-black/8 bg-white/72 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-gray-500 backdrop-blur-md">
                  CURATED AI TOOLS
                </div>
                <div className="inline-flex items-center rounded-full border border-black/8 bg-white/72 px-3 py-1 text-[11px] text-gray-500 backdrop-blur-md">
                  持续更新
                </div>
              </div>

              <div className="mx-auto max-w-3xl space-y-3">
                <h1 className="text-[34px] font-semibold tracking-tight text-gray-950 sm:text-[56px] sm:leading-[1.02]">
                  发现真正值得使用的 AI 工具
                </h1>
                <p className="mx-auto max-w-2xl text-sm leading-7 text-gray-600 sm:text-[15px]">
                  覆盖聊天、写作、绘图、视频、搜索与效率场景，帮你更快找到真正适合自己的产品。
                </p>
              </div>

              <div className="mx-auto max-w-3xl">
                <div className="rounded-[22px] border border-black/8 bg-white/88 p-1.5 shadow-[0_8px_22px_rgba(15,23,42,0.045)] backdrop-blur-md">
                  <SearchBar />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <HeroAction href="/submit" primary>
                  提交你的 AI 工具
                </HeroAction>
                <HeroAction href="/featured">浏览精选</HeroAction>
              </div>
            </div>
          </section>

          <FeatureEntryStrip />
        </div>

        <section className="space-y-3.5 sm:space-y-4">
          <SectionTitle
            title="热门分类"
            description="先从常见需求进入，再继续浏览完整目录"
          />

          {categories.length === 0 ? (
            <EmptyBox text="暂时还没有可展示的分类。" />
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {categories.map((category) => (
                <PillLink key={category.id} href={`/category/${category.slug}`}>
                  {category.name}
                </PillLink>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3.5 sm:space-y-4">
          <SectionTitle
            title="推荐工具"
            description={
              featuredTotal > 0
                ? "编辑精选 · 持续补充"
                : "优先展示值得先看的工具"
            }
            right={
              <Link
                href="/featured"
                className="text-gray-600 underline underline-offset-4 transition-colors hover:text-gray-950"
              >
                查看全部推荐
              </Link>
            }
          />

          {featuredCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {featuredCategories.map((category) => (
                <PillLink key={category.id} href={`/category/${category.slug}`}>
                  {category.name} · {category.count}
                </PillLink>
              ))}
            </div>
          ) : null}

          {featuredTools.length === 0 ? (
            <EmptyBox text="暂时还没有推荐工具。" />
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {featuredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3.5 sm:space-y-4">
          <SectionTitle
            title="热门工具"
            description="综合官网点击、浏览与历史热度排序"
            right={
              <Link
                href="/popular"
                className="text-gray-600 underline underline-offset-4 transition-colors hover:text-gray-950"
              >
                查看更多热门工具
              </Link>
            }
          />

          {popularTools.length === 0 ? (
            <EmptyBox text="暂时还没有可展示的热门工具。" />
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {popularTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3.5 sm:space-y-4">
          <SectionTitle
            title="最新收录"
            description="最近加入目录的新工具"
            right={
              <Link
                href="/latest"
                className="text-gray-600 underline underline-offset-4 transition-colors hover:text-gray-950"
              >
                查看更多最新工具
              </Link>
            }
          />

          {latestTools.length === 0 ? (
            <EmptyBox text="暂时还没有最新收录工具。" />
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {latestTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <SectionTitle
            title="重点分类合集"
            description="先看几个核心方向，再进入对应分类页"
          />

          {sectionCategories.length === 0 ? (
            <EmptyBox text="暂时还没有可展示的重点分类。" />
          ) : (
            <div className="space-y-8 sm:space-y-10">
              {sectionCategories.map((category) => (
                <section key={category.id} className="space-y-3.5 sm:space-y-4">
                  <SectionTitle
                    title={category.name}
                    description={`已收录 ${category.count} 款工具`}
                    right={
                      <Link
                        href={`/category/${category.slug}`}
                        className="text-gray-600 underline underline-offset-4 transition-colors hover:text-gray-950"
                      >
                        查看该分类全部工具
                      </Link>
                    }
                  />

                  {category.tools.length === 0 ? (
                    <EmptyBox text="该分类暂时还没有可展示的工具。" />
                  ) : (
                    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                      {category.tools.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}