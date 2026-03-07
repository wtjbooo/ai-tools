import Link from "next/link";
import { prisma } from "@/lib/db";
import SearchBar from "@/components/SearchBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tools = await prisma.tool.findMany({
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
    take: 18,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
      <section className="space-y-4 text-center">
        <h1 className="text-4xl font-bold">AI 工具导航</h1>
        <p className="text-gray-600">
          帮你快速找到值得使用的 AI 工具，覆盖聊天、写作、绘图、视频、搜索、效率等场景。
        </p>

        <div className="mx-auto max-w-4xl">
          <SearchBar />
        </div>

        <div>
          <Link href="/submit" className="underline">
            提交你的 AI 工具
          </Link>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">热门工具</h2>
          <Link href="/search" className="text-sm underline">
            查看更多
          </Link>
        </div>

        {tools.length === 0 ? (
          <div className="rounded-2xl border p-6 text-gray-600">
            暂时还没有已发布的工具。
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
              const showPricing =
                tool.pricing &&
                tool.pricing !== "unknown" &&
                tool.pricing !== "未知";

              const tags = tool.tags.map((item) => item.tag.name).slice(0, 4);
              const logoSrc =
                tool.logoUrl && tool.logoUrl.trim() !== ""
                  ? tool.logoUrl
                  : "/default-tool-icon.png";

              return (
                <Link
                  key={tool.id}
                  href={`/tool/${tool.slug}`}
                  className="block rounded-2xl border bg-white p-4 transition hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="text-xl font-semibold">{tool.name}</div>
                        <div className="text-sm text-gray-600">
                          {tool.category?.name ?? "未分类"}
                        </div>
                      </div>

                      <img
                        src={logoSrc}
                        alt={`${tool.name} logo`}
                        width={24}
                        height={24}
                        className="mt-1 h-6 w-6 rounded object-cover shrink-0"
                      />
                    </div>

                    <p className="text-sm text-gray-700 line-clamp-3">
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

                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border px-2 py-1"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}