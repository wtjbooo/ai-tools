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
      <div className="p-10 space-y-3">
        <h1 className="text-2xl font-bold">分类不存在</h1>
        <p className="text-gray-600">id: {id}</p>
        <Link className="underline" href="/">
          返回首页 →
        </Link>
      </div>
    );
  }

  const tools = await prisma.tool.findMany({
    where: { categoryId: category.id },
    include: { category: true },
    orderBy: [{ featured: "desc" }, { clicks: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        <p className="text-gray-600">共 {tools.length} 个工具</p>
        <Link className="underline" href="/">
          ← 返回首页
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {tools.map((t) => (
          <Link
            key={t.id}
            href={`/tool/${t.slug}`}
            className="block rounded-xl border bg-white p-4 hover:shadow-lg transition"
          >
            <div className="font-semibold">{t.name}</div>

            <div className="text-sm text-gray-600 mt-1">
              {t.category?.name ?? "未分类"} · 点击 {t.clicks ?? 0} · 价格{" "}
              {t.pricing ?? "未知"}
            </div>

            <p className="text-sm mt-2 text-gray-700">
              {t.description ?? "暂无简介"}
            </p>

            <span className="text-sm mt-3 inline-block underline">
              查看详情 →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}