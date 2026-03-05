import { prisma } from "@/lib/db";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {

  const [categories, tools] = await Promise.all([
    prisma.category.findMany({
      include: {
        tools: true
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),

    prisma.tool.findMany({
      include: { category: true },
      where: {
        isPublished: true
      },
      orderBy: [
        { featured: "desc" },
        { clicks: "desc" },
        { createdAt: "desc" },
      ],
      take: 50,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-10">

      {/* Header */}
      <header className="space-y-4 text-center">
        <h1 className="text-4xl font-bold">
          AI 工具导航
        </h1>

        <p className="text-gray-500">
          收录 ChatGPT、Claude、Midjourney、DeepSeek 等 AI 工具
        </p>

        <SearchBar />

        <Link
          className="text-sm underline"
          href="/submit"
        >
          提交 AI 工具 →
        </Link>
      </header>


      {/* 热门工具 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          🔥 热门 AI 工具
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {tools.slice(0, 6).map((t) => {

            const domain =
              t.website
                ?.replace("https://", "")
                .replace("http://", "")
                .split("/")[0] ?? "";

            return (
              <Link
                key={t.id}
                href={`/tool/${t.slug}`}
                className="border rounded-lg p-4 hover:shadow-md transition"
              >

                <div className="flex items-center gap-2 font-semibold">

                  {domain && (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                      width="20"
                      height="20"
                      alt=""
                    />
                  )}

                  {t.name}
                </div>

                <div className="text-sm text-gray-500 mt-1">
                  {t.description ?? "暂无简介"}
                </div>

              </Link>
            );
          })}
        </div>
      </section>


      {/* 分类 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          分类
        </h2>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.id}`}
              className="px-3 py-1 rounded-full bg-gray-100 text-sm hover:bg-gray-200"
            >
              {c.name} ({c.tools.length})
            </Link>
          ))}
        </div>
      </section>


      {/* 工具列表 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          最新 AI 工具
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {tools.map((t) => {

            const domain =
              t.website
                ?.replace("https://", "")
                .replace("http://", "")
                .split("/")[0] ?? "";

            return (
              <Link
                key={t.id}
                href={`/tool/${t.slug}`}
                className="block rounded-xl border bg-white p-4 hover:shadow-lg transition"
              >

                <div className="flex items-center gap-2 font-semibold">

                  {domain && (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                      width="20"
                      height="20"
                      alt=""
                    />
                  )}

                  {t.name}

                </div>

                <div className="text-sm text-gray-600 mt-1">
                  {t.category?.name ?? "未分类"} · 点击 {t.clicks ?? 0} · 价格 {t.pricing ?? "未知"}
                </div>

                <p className="text-sm mt-2 text-gray-700">
                  {t.description ?? "暂无简介"}
                </p>

                <span className="text-sm mt-3 inline-block underline">
                  查看详情 →
                </span>

              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}