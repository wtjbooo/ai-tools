import Link from "next/link";
import { prisma } from "@/lib/db";
import SearchBar from "@/components/SearchBar";

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
        orderBy: [{ featured: "desc" }, { clicks: "desc" }, { createdAt: "desc" }],
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
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
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

function ToolCard({ tool }: any) {
  const showPricing =
    tool.pricing && tool.pricing !== "unknown" && tool.pricing !== "未知";

  const tags = tool.tags.map((item: any) => item.tag.name).slice(0, 3);

  const logoSrc =
    tool.logoUrl && tool.logoUrl.trim() !== ""
      ? tool.logoUrl
      : "/default-tool-icon.png";

  const showOutClicks = typeof tool.outClicks === "number" && tool.outClicks > 0;
  const showViews = typeof tool.views === "number" && tool.views > 0;

  return (
    <Link
      href={`/tool/${tool.slug}`}
      className="group block rounded-[22px] border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.015] hover:border-gray-300 hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)] active:scale-[0.995] sm:rounded-[24px] sm:p-5"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="truncate text-base font-semibold tracking-tight text-gray-950 transition-colors duration-300 group-hover:text-black sm:text-lg">
              {tool.name}
            </div>
            <div className="text-sm text-gray-500">
              {tool.category?.name ?? "未分类"}
            </div>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-gray-100 transition-all duration-300 group-hover:bg-white group-hover:ring-gray-200 sm:h-10 sm:w-10">
            <img
              src={logoSrc}
              alt={`${tool.name} logo`}
              width={24}
              height={24}
              className="h-5 w-5 rounded object-cover transition-transform duration-300 group-hover:scale-105 sm:h-6 sm:w-6"
            />
          </div>
        </div>

        <p className="line-clamp-3 min-h-[54px] text-sm leading-6 text-gray-600 sm:min-h-[60px]">
          {tool.description || "暂无简介"}
        </p>

        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          {showOutClicks ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:bg-gray-200/70">
              官网点击 {tool.outClicks}
            </span>
          ) : null}

          {showViews ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:bg-gray-200/70">
              浏览 {tool.views}
            </span>
          ) : null}

          {showPricing ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:bg-gray-200/70">
              {tool.pricing}
            </span>
          ) : null}

          {tags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 transition-colors duration-300 group-hover:border-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-gray-200 bg-white p-5 text-gray-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:rounded-[24px] sm:p-6">
      {text}
    </div>
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="space-y-10 sm:space-y-14">
        <section className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-white px-4 py-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:rounded-[32px] sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.08),transparent_30%)]" />
          <div className="relative mx-auto max-w-4xl space-y-4 sm:space-y-5">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
                AI 工具导航
              </h1>
              <p className="mx-auto max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
                帮你快速找到值得使用的 AI 工具，覆盖聊天、写作、绘图、视频、搜索、效率等场景。
              </p>
            </div>

            <div className="mx-auto max-w-4xl">
              <div className="rounded-[24px] border border-gray-200 bg-white/90 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.05)] backdrop-blur sm:rounded-[28px]">
                <SearchBar />
              </div>
            </div>

            <div>
              <Link
                href="/submit"
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:text-gray-950 hover:shadow-sm active:scale-[0.98]"
              >
                提交你的 AI 工具
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-4 sm:space-y-5">
          <SectionTitle
            title="热门分类"
            description="从常见需求出发，快速进入对应工具方向"
          />

          {categories.length === 0 ? (
            <EmptyBox text="暂时还没有可展示的分类。" />
          ) : (
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <PillLink
                  key={category.id}
                  href={`/category/${category.slug}`}
                >
                  {category.name}
                </PillLink>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 sm:space-y-5">
          <SectionTitle
            title="推荐工具"
            description={`当前共收录 ${featuredTotal} 个精选推荐工具`}
            right={
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {!hasManualFeatured ? (
                  <span className="text-gray-500">当前为自动推荐</span>
                ) : null}
                <Link
                  href="/featured"
                  className="text-gray-600 underline underline-offset-4 transition-colors hover:text-gray-950"
                >
                  查看全部精选 →
                </Link>
              </div>
            }
          />

          {featuredCategories.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              <PillLink href="/featured">全部精选（{featuredTotal}）</PillLink>

              {featuredCategories.map((category) => (
                <PillLink
                  key={category.id}
                  href={`/featured?category=${encodeURIComponent(category.slug)}`}
                >
                  {category.name}（{category.count}）
                </PillLink>
              ))}
            </div>
          ) : null}

          {featuredTools.length === 0 ? (
            <EmptyBox text="暂时还没有推荐工具。" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {featuredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 sm:space-y-5">
          <SectionTitle title="热门工具" />

          {popularTools.length === 0 ? (
            <EmptyBox text="暂时还没有热门工具。" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {popularTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 sm:space-y-5">
          <SectionTitle title="最新收录" />

          {latestTools.length === 0 ? (
            <EmptyBox text="暂时还没有最新收录的工具。" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {latestTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6 sm:space-y-8">
          <SectionTitle
            title="按分类浏览"
            description="更像目录站的逛法"
          />

          {sectionCategories.length === 0 ? (
            <EmptyBox text="暂时还没有可展示的分类模块。" />
          ) : (
            <div className="space-y-8 sm:space-y-10">
              {sectionCategories.map((category) => (
                <section key={category.id} className="space-y-4 sm:space-y-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-xl font-semibold tracking-tight text-gray-950 sm:text-2xl">
                      {category.name}（{category.count}）
                    </h3>
                    <Link
                      href={`/category/${category.slug}`}
                      className="text-sm text-gray-600 underline underline-offset-4 transition-colors hover:text-gray-950"
                    >
                      更多 →
                    </Link>
                  </div>

                  {category.tools.length === 0 ? (
                    <EmptyBox text="这个分类下暂时还没有工具。" />
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
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