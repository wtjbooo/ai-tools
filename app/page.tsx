import Link from "next/link";
import { prisma } from "@/lib/db";
import SearchBar from "@/components/SearchBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tools = await prisma.tool.findMany({
    where: { isPublished: true },
    include: {
      category: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: [{ featured: "desc" }, { clicks: "desc" }, { createdAt: "desc" }],
    take: 24,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-12">
      <header className="space-y-5 text-center">
        <h1 className="text-4xl font-bold">AI 工具导航</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          帮你快速找到值得使用的 AI 工具，覆盖聊天、写作、绘图、视频、搜索、效率等场景。
        </p>

        <SearchBar />

        <div>
          <Link href="/submit" className="underline">
            提交你的 AI 工具
          </Link>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">热门工具</h2>
          <Link href="/search" className="text-sm underline">
            查看更多
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const showPricing =
              tool.pricing &&
              tool.pricing !== "unknown" &&
              tool.pricing !== "未知";

            const domain = tool.website
              ?.replace(/^https?:\/\//, "")
              .replace(/^www\./, "")
              .split("/")[0];

            return (
              <Link
                key={tool.id}
                href={`/tool/${tool.slug}`}
                className="rounded-2xl border p-5 hover:shadow-md transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{tool.name}</h3>
                      <p className="text-sm text-gray-500">
                        {tool.category?.name || "未分类"}
                      </p>
                    </div>

                    {domain ? (
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                        alt=""
                        width={24}
                        height={24}
                      />
                    ) : null}
                  </div>

                  <p className="text-sm text-gray-700 line-clamp-2">
                    {tool.description || "暂无简介"}
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                    {tool.featured ? (
                      <span className="rounded-full bg-black px-2 py-1 text-white">
                        推荐
                      </span>
                    ) : null}

                    {showPricing ? (
                      <span className="rounded-full bg-gray-100 px-2 py-1">
                        {tool.pricing}
                      </span>
                    ) : null}

                    {tool.clicks > 0 ? (
                      <span className="rounded-full bg-gray-100 px-2 py-1">
                        点击 {tool.clicks}
                      </span>
                    ) : null}

                    {tool.tags.slice(0, 3).map((item) => (
                      <span
                        key={item.tag.id}
                        className="rounded-full border px-2 py-1"
                      >
                        {item.tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}