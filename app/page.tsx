import Link from "next/link";
import { prisma } from "@/lib/db";
import SearchBar from "@/components/SearchBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getHomeData() {
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
    orderBy: [
      {
        featuredOrder: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
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
        orderBy: {
          clicks: "desc",
        },
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
    orderBy: {
      clicks: "desc",
    },
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

  return {
    featuredTools,
    popularTools,
    latestTools,
    categories,
    hasManualFeatured,
  };
}

function ToolCard({ tool }: any) {
  const showPricing =
    tool.pricing && tool.pricing !== "unknown" && tool.pricing !== "未知";

  const tags = tool.tags.map((item: any) => item.tag.name).slice(0, 3);

  const logoSrc =
    tool.logoUrl && tool.logoUrl.trim() !== ""
      ? tool.logoUrl
      : "/default-tool-icon.png";

  return (
    <Link
      href={`/tool/${tool.slug}`}
      className="block rounded-2xl border bg-white p-4 transition hover:shadow-md"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="text-lg font-semibold">{tool.name}</div>
            <div className="text-sm text-gray-600">
              {tool.category?.name ?? "未分类"}
            </div>
          </div>

          <img
            src={logoSrc}
            alt={`${tool.name} logo`}
            width={24}
            height={24}
            className="h-6 w-6 shrink-0 rounded object-cover"
          />
        </div>

        <p className="line-clamp-3 text-sm text-gray-700">
          {tool.description || "暂无简介"}
        </p>

        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          {tool.clicks > 0 ? (
            <span className="rounded-full bg-gray-100 px-2 py-1">
              点击 {tool.clicks}
            </span>
          ) : null}

          {showPricing ? (
            <span className="rounded-full bg-gray-100 px-2 py-1">
              {tool.pricing}
            </span>
          ) : null}

          {tags.map((tag: string) => (
            <span key={tag} className="rounded-full border px-2 py-1">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const {
    featuredTools,
    popularTools,
    latestTools,
    categories,
    hasManualFeatured,
  } = await getHomeData();

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-6 py-10">
      <section className="space-y-4 text-center">
        <h1 className="text-4xl font-bold">AI 工具导航</h1>
        <p className="text-gray-600">
          帮你快速找到值得使用的 AI 工具，覆盖聊天、写作、绘图、视频、搜索、效率等场景。
        </p>

        <div className="mx-auto max-w-4xl">
          <SearchBar />
        </div>

        <Link href="/submit" className="underline">
          提交你的 AI 工具
        </Link>
      </section>

      <section className="space-y-5">
        <h2 className="text-2xl font-bold">热门分类</h2>

        {categories.length === 0 ? (
          <div className="rounded-2xl border p-6 text-gray-600">
            暂时还没有可展示的分类。
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="rounded-full border px-4 py-2 text-sm transition hover:bg-gray-100"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">推荐工具</h2>
          {!hasManualFeatured ? (
            <span className="text-sm text-gray-500">当前为自动推荐</span>
          ) : null}
        </div>

        {featuredTools.length === 0 ? (
          <div className="rounded-2xl border p-6 text-gray-600">
            暂时还没有推荐工具。
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <h2 className="text-2xl font-bold">热门工具</h2>

        {popularTools.length === 0 ? (
          <div className="rounded-2xl border p-6 text-gray-600">
            暂时还没有热门工具。
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <h2 className="text-2xl font-bold">最新收录</h2>

        {latestTools.length === 0 ? (
          <div className="rounded-2xl border p-6 text-gray-600">
            暂时还没有最新收录的工具。
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}