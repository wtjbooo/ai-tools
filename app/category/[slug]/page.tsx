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

  const title = `${category.name} 分类合集`;
  const description = `查看 ${category.name} 分类下的 AI 工具，当前共收录 ${category._count.tools} 个工具。`;

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="rounded-[30px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] px-6 py-10 shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:px-10 sm:py-12">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center rounded-full border border-black/8 bg-white/72 px-3 py-1 text-xs font-medium tracking-[0.16em] text-gray-500 uppercase">
            Category
          </div>

          <div className="space-y-2">
            <div className="text-sm text-gray-500">
              <Link href="/" className="hover:text-gray-900">
                首页
              </Link>
              <span className="mx-2 text-gray-300">/</span>
              <span>{category.name}</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              {category.name}
            </h1>

            <p className="text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">
              当前分类共收录 {category._count.tools} 个工具，集中浏览这个方向下的 AI 工具。
            </p>
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

      <section className="mt-10">
        {tools.length === 0 ? (
          <div className="rounded-[22px] border border-black/8 bg-white/92 p-6 text-sm text-gray-500 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
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
  );
}
