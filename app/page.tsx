import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import SearchBar from "@/components/SearchBar";
import ToolCard from "@/components/ToolCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORY_SECTIONS_LIMIT = 4;
const CATEGORY_TOOLS_LIMIT = 6;

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

  const hasManualFeatured = manualFeaturedTools.length > 0;

  const featuredTools = hasManualFeatured
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
    hasManualFeatured,
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
        <h2 className="text-[26px] font-semibold tracking-tight text-gray-950 sm:text-[30px]">
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

export default async function HomePage() {
  const {
    featuredTools,
    featuredTotal,
    featuredCategories,
    popularTools,
    latestTools,
    categories,
    hasManualFeatured,
    sectionCategories,
  } = await getHomeData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="space-y-8 sm:space-y-10">
        <section className="relative overflow-hidden rounded-[30px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] px-5 py-6 shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.10),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.08),transparent_26%)]" />

          <div className="relative mx-auto max-w-5xl space-y-4 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <div className="inline-flex items-center rounded-full border border-black/8 bg-white/72 px-3 py-1 text-xs font-medium tracking-[0.18em] text-gray-500 backdrop-blur-md">
                CURATED AI TOOLS
              </div>
              <div className="inline-flex items-center rounded-full border border-black/8 bg-white/72 px-3 py-1 text-xs text-gray-500 backdrop-blur-md">
                已收录 精选 {featuredTotal > 0 ? `${featuredTotal}+` : "1+"}
              </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-2.5">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-[50px] sm:leading-[1.02]">
                AI工具导航
              </h1>
              <p className="mx-auto max-w-2xl text-sm leading-7 text-gray-600 sm:text-[15px]">
                帮你快速找到值得使用的 AI 工具，覆盖聊天、写作、绘图、视频、搜索、效率等场景。
              </p>
            </div>

            <div className="mx-auto max-w-4xl">
              <div className="rounded-[22px] border border-black/8 bg-white/88 p-1.5 shadow-[0_8px_22px_rgba(15,23,42,0.045)] backdrop-blur-md">
                <SearchBar />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <HeroAction href="/submit" primary>
                提交你的 AI 工具
              </HeroAction>
              <HeroAction href="/featured">浏览精选推荐</HeroAction>
            </div>
          </div>
        </section>

        <section className="space-y-3.5 sm:space-y-4">
          <SectionTitle
            title="热门分类"
            description="从常见需求出发，快速进入对应工具方向"
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
            description={`当前共收录 ${featuredTotal} 个精选推荐工具`}
            right={
              <div className="flex flex-wrap items-center gap-3">
                {!hasManualFeatured ? (
                  <span className="text-gray-500">当前为自动推荐</span>
                ) : null}
                <Link
                  href="/featured"
                  className="text-gray-600 underline underline-offset-4 transition-colors hover:text-gray-950"
                >
                  查看全部推荐
                </Link>
              </div>
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
            description="按官网点击、浏览和历史热度综合排序"
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
            description="看看最近刚加入目录的新工具"
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

        {sectionCategories.map((category) => (
          <section key={category.id} className="space-y-3.5 sm:space-y-4">
            <SectionTitle
              title={category.name}
              description={`当前分类共收录 ${category.count} 个工具`}
              right={
                <Link
                  href={`/category/${category.slug}`}
                  className="text-gray-600 underline underline-offset-4 transition-colors hover:text-gray-950"
                >
                  查看全部
                </Link>
              }
            />

            {category.tools.length === 0 ? (
              <EmptyBox text={`“${category.name}” 暂时还没有可展示的工具。`} />
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
    </div>
  );
}