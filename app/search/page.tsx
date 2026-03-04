import Link from "next/link";
import { prisma } from "@/lib/db";
import SearchBar from "@/components/SearchBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();

  // 没有关键词：给提示
  if (!q) {
    return (
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        <h1 className="text-3xl font-bold">搜索</h1>
        <SearchBar />
        <p className="text-gray-600">请输入关键词开始搜索。</p>
        <Link className="underline" href="/">← 返回首页</Link>
      </div>
    );
  }

  const tools = await prisma.tool.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { searchText: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: { category: true },
    orderBy: [{ featured: "desc" }, { clicks: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">搜索结果</h1>
        <p className="text-gray-600">
          关键词：<code>{q}</code> · 共 {tools.length} 条
        </p>
      </div>

      <SearchBar defaultValue={q} />

      {tools.length === 0 ? (
        <div className="rounded-xl border p-6 text-gray-600">
          没找到相关工具。换个关键词试试（如：PPT、图片、翻译、写作）。
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tools.map((t) => (
            <Link
              key={t.id}
              href={`/tool/${t.slug}`}
              className="block rounded-xl border bg-white p-4 hover:shadow-lg transition"
            >
              <div className="font-semibold">{t.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                {t.category?.name ?? "未分类"} · 点击 {t.clicks ?? 0} · 价格 {t.pricing ?? "未知"}
              </div>
              <p className="text-sm mt-2 text-gray-700">
                {t.description ?? "暂无简介"}
              </p>
              <span className="text-sm mt-3 inline-block underline">查看详情 →</span>
            </Link>
          ))}
        </div>
      )}

      <Link className="underline block" href="/">← 返回首页</Link>
    </div>
  );
}