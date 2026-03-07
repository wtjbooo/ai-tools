import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const tool = await prisma.tool.findUnique({
    where: { slug: params.slug },
    include: {
      category: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!tool) {
    return {
      title: "工具不存在",
      description: "你访问的工具页面不存在。",
    };
  }

  const description =
    tool.description ||
    `${tool.name} 的详细介绍、分类、标签、价格和官网入口`;

  const url = `https://y78bq.dpdns.org/tool/${tool.slug}`;

  return {
    title: tool.name,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: tool.name,
      description,
      url,
      siteName: "AI 工具目录",
      type: "article",
    },
  };
}

export default async function ToolPage({ params }: { params: { slug: string } }) {
  const tool = await prisma.tool.findUnique({
    where: { slug: params.slug },
    include: {
      category: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!tool) {
    notFound();
  }

  const showPricing =
    tool.pricing &&
    tool.pricing !== "unknown" &&
    tool.pricing !== "未知";

  const showContent = tool.content && tool.content.trim() !== "";
  const tagList = tool.tags.map((item) => item.tag.name);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div className="space-y-4">
        <Link href="/" className="text-sm underline">
          ← 返回首页
        </Link>

        <h1 className="text-3xl font-bold">{tool.name}</h1>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-gray-100 px-3 py-1">
            主分类：{tool.category?.name || "未分类"}
          </span>

          {showPricing ? (
            <span className="rounded-full bg-gray-100 px-3 py-1">
              价格：{tool.pricing}
            </span>
          ) : null}

          {tool.clicks > 0 ? (
            <span className="rounded-full bg-gray-100 px-3 py-1">
              点击：{tool.clicks}
            </span>
          ) : null}
        </div>

        <p className="text-lg text-gray-700">{tool.description || "暂无简介"}</p>
      </div>

      {tagList.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">相关标签</h2>
          <div className="flex flex-wrap gap-2">
            {tagList.map((tag) => (
              <span key={tag} className="rounded-full border px-3 py-1 text-sm">
                {tag}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">官网入口</h2>
        {tool.website ? (
          <a
            href={tool.website}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-xl bg-black px-4 py-2 text-white"
          >
            访问官网
          </a>
        ) : (
          <p className="text-gray-600">暂未提供官网链接</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">详细介绍</h2>
        <div className="rounded-2xl border p-5 text-gray-700 leading-7">
          {showContent ? (
            <p className="whitespace-pre-line">{tool.content}</p>
          ) : (
            <p>当前还没有更详细的介绍，后续可以补充适合人群、核心功能、优缺点、使用场景等内容。</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">基础信息</h2>
        <div className="rounded-2xl border p-5 text-sm text-gray-700 space-y-2">
          <p>收录时间：{new Date(tool.createdAt).toLocaleString("zh-CN")}</p>
          <p>最后更新：{new Date(tool.updatedAt).toLocaleString("zh-CN")}</p>
          <p>Slug：{tool.slug}</p>
        </div>
      </section>
    </div>
  );
}