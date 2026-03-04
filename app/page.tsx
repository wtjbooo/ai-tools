import { prisma } from "@/lib/db";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, tools] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
    prisma.tool.findMany({
      include: { category: true },
      orderBy: [{ featured: "desc" }, { clicks: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">AI 工具目录</h1>
        <p className="text-gray-600">
          如果你能在下面看到“示例：Chat 工具”等数据，就说明数据库已连接成功 ✅
        </p>
        <SearchBar />
<Link className="underline text-sm" href="/submit">提交收录 →</Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">分类</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.id}`}
              className="px-3 py-1 rounded-full bg-gray-100 text-sm hover:bg-gray-200"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">工具列表</h2>

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
      </section>
    </div>
  );
}