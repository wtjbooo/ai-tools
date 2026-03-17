import Link from "next/link";
import { prisma } from "@/lib/db";
import ToolCard from "@/components/ToolCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getLatestTools() {
  return prisma.tool.findMany({
    where: {
      isPublished: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 60,
    include: {
      category: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

export default async function LatestPage() {
  const tools = await getLatestTools();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="rounded-[30px] border border-black/8 bg-white px-6 py-10 shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:px-10 sm:py-14">
        <div className="max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-black/8 bg-white/72 px-3 py-1 text-xs font-medium tracking-[0.16em] text-gray-500 uppercase">
            Latest Tools
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
            最新收录
          </h1>

          <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">
            查看最近加入目录的新工具，快速了解最近更新了哪些内容。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
            >
              返回首页
            </Link>
            <Link
              href="/featured"
              className="inline-flex items-center rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              浏览精选推荐
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10">
        {tools.length === 0 ? (
          <div className="rounded-[22px] border border-black/8 bg-white/92 p-5 text-gray-500 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            暂无最新收录工具
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}