import Link from "next/link";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);

  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-3">
        <h1 className="text-2xl font-bold">没有找到这个分类</h1>
        <p className="text-gray-600">分类 ID：{id}</p>
        <Link className="underline" href="/">
          返回首页
        </Link>
      </div>
    );
  }

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

  return (
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
  );
}