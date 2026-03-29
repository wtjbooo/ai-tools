import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ToolCard from "@/components/ToolCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_NAME = "AI 工具目录";
const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") || "https://y78bq.dpdns.org";

type PageProps = {
  params: {
    slug: string;
  };
};

async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      updatedAt: true,
      _count: {
        select: {
          tools: {
            where: {
              isPublished: true,
            },
          },
        },
      },
    },
  });
}

async function getCategoryTools(categoryId: string) {
  return prisma.tool.findMany({
    where: {
      categoryId,
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
    orderBy: [
      { featured: "desc" },
      { outClicks: "desc" },
      { views: "desc" },
      { clicks: "desc" },
      { createdAt: "desc" },
    ],
    take: 60,
  });
}

function getCategoryLead(name: string, count: number) {
  const lower = name.toLowerCase();

  if (lower.includes("chat") || name.includes("聊天")) {
    return `围绕对话、问答、助手类体验整理这一方向的 AI 工具，方便你快速比较不同产品的定位与适用场景。当前可浏览 ${count} 款工具。`;
  }

  if (name.includes("写作") || name.includes("文案")) {
    return `适合寻找内容生成、润色、总结与文本效率工具的用户。当前已整理 ${count} 款相关产品，便于集中查看。`;
  }

  if (name.includes("绘图") || name.includes("图像") || name.includes("生图")) {
    return `这一分类更适合查找图像生成、风格控制与视觉创作方向的 AI 工具。当前可浏览 ${count} 款产品。`;
  }

  if (name.includes("视频")) {
    return `这一分类主要收录与视频生成、编辑、镜头表达和动态创作相关的 AI 工具，方便集中筛选与对比。当前可浏览 ${count} 款工具。`;
  }

  if (name.includes("搜索")) {
    return `适合想查找 AI 搜索、信息整合与答案生成类产品的用户。当前已整理 ${count} 款相关工具。`;
  }

  if (name.includes("效率") || name.includes("办公")) {
    return `这一分类更偏向效率提升、流程辅助与日常协作场景。当前共整理 ${count} 款工具。`;
  }

  return `集中浏览「${name}」方向的 AI 工具，更快找到适合自己的产品。当前已收录 ${count} 款工具。`;
}

function getCategoryHint(name: string) {
  if (name.includes("聊天")) {
    return "更适合先看回答质量、上下文能力、插件生态和中文体验。";
  }

  if (name.includes("写作")) {
    return "更适合优先比较生成质量、改写能力、结构控制与中文表达。";
  }

  if (name.includes("绘图") || name.includes("图像") || name.includes("生图")) {
    return "更适合优先比较风格一致性、细节控制、出图速度与提示词可控性。";
  }

  if (name.includes("视频")) {
    return "更适合优先比较镜头稳定性、运动表达、人物一致性与生成成本。";
  }

  if (name.includes("搜索")) {
    return "更适合优先比较检索范围、答案质量、引用能力与信息时效性。";
  }

  return "建议先看定位和标签，再挑 2～3 个同类工具横向对比。";
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);

  if (!category) {
    return {
      title: "分类不存在",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${category.name} AI 工具推荐`;
  const description = `发现适合 ${category.name} 场景的 AI 工具，当前已收录 ${category._count.tools} 款产品。`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/category/${category.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/category/${category.slug}`,
      siteName: SITE_NAME,
      locale: "zh_CN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const category = await getCategoryBySlug(params.slug);

  if (!category) {
    notFound();
  }

  const tools = await getCategoryTools(category.id);
  const lead = getCategoryLead(category.name, category._count.tools);
  const hint = getCategoryHint(category.name);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[30px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] px-6 py-10 shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.08),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.06),transparent_26%)]" />

          <div className="relative max-w-4xl space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center rounded-full border border-black/8 bg-white/72 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-gray-500 uppercase">
                Category
              </span>

              <div className="text-sm text-gray-500">
                <Link href="/" className="transition hover:text-gray-900">
                  首页
                </Link>
                <span className="mx-2 text-gray-300">/</span>
                <span>{category.name}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-[48px] sm:leading-[1.04]">
                {category.name}
              </h1>

              <p className="max-w-3xl text-sm leading-7 text-gray-600 sm:text-[15px]">
                {lead}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <div className="inline-flex items-center rounded-full border border-black/8 bg-white/78 px-3.5 py-2 text-sm text-gray-700">
                已收录 {category._count.tools} 款工具
              </div>
              <div className="inline-flex items-center rounded-full border border-black/8 bg-white/78 px-3.5 py-2 text-sm text-gray-700">
                最近更新 {category.updatedAt.toLocaleDateString("zh-CN")}
              </div>
            </div>

            <div className="rounded-[22px] border border-black/8 bg-white/78 px-4 py-4 text-sm leading-7 text-gray-600">
              {hint}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] active:scale-[0.98]"
              >
                返回首页
              </Link>

              <Link
                href="/featured"
                className="inline-flex items-center rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-black/12 hover:bg-gray-50 hover:text-gray-950 active:scale-[0.98]"
              >
                浏览精选推荐
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-[26px] font-semibold tracking-tight text-gray-950 sm:text-[30px]">
                收录工具
              </h2>
              <p className="text-sm leading-6 text-gray-500">
                优先展示更值得先看的产品，再继续按同类方向比较。
              </p>
            </div>

            <div className="text-sm text-gray-500">
              共 {tools.length} 条结果
            </div>
          </div>

          {tools.length === 0 ? (
            <div className="rounded-[22px] border border-black/8 bg-white/92 p-6 text-sm leading-7 text-gray-500 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              这个分类下暂时还没有可展示的工具。
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
    </div>
  );
}