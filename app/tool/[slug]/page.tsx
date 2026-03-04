export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";

type Props = {
  params: { slug: string };
};

export default async function ToolDetail({ params }: Props) {
  const slug = decodeURIComponent(params.slug);

  const tool = await prisma.tool.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!tool) {
    const examples = await prisma.tool.findMany({
      select: { slug: true, name: true },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return (
      <div className="p-10 space-y-3">
        <h1 className="text-2xl font-bold">没有找到这个工具</h1>
        <p className="text-gray-600">
          当前 slug：<code>{slug}</code>
        </p>

        <div className="text-gray-600">
          <div className="font-semibold mb-1">数据库里最近的工具示例（前 10 条）：</div>
          <ul className="list-disc pl-5">
            {examples.map((x) => (
              <li key={x.slug}>
                <Link className="underline" href={`/tool/${x.slug}`}>
                  {x.name}（{x.slug}）
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Link className="underline" href="/">
          返回首页 →
        </Link>
      </div>
    );
  }

  // 进入详情页就 +1 点击（失败不影响页面）
  prisma.tool
    .update({ where: { id: tool.id }, data: { clicks: { increment: 1 } } })
    .catch(() => {});

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{tool.name}</h1>
        <p className="text-gray-600">
          分类：{tool.category?.name ?? "未分类"} · 点击：{tool.clicks ?? 0} · 价格：{tool.pricing ?? "未知"}
        </p>
      </div>

      <p className="text-gray-800">{tool.description ?? "暂无简介"}</p>

      {tool.website ? (
        <a className="underline inline-block" href={tool.website} target="_blank" rel="noreferrer">
          访问官网 →
        </a>
      ) : null}

      <Link className="underline block" href="/">
        ← 返回首页
      </Link>
    </div>
  );
}