import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }) {
  const tool = await prisma.tool.findUnique({
    where: { slug: params.slug },
  });

  if (!tool) return {};

  return {
    title: `${tool.name} - AI工具 | AI工具目录`,
    description: tool.description,
  };
}

export default async function ToolPage({ params }) {

  const tool = await prisma.tool.findUnique({
    where: { slug: params.slug },
    include: {
      category: true
    }
  });

  if (!tool) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">

      <h1 className="text-3xl font-bold">
        {tool.name}
      </h1>

      <div className="text-gray-600">
        分类：{tool.category?.name ?? "未分类"}
      </div>

      <p className="text-lg">
        {tool.description}
      </p>

      <a
        href={tool.website ?? "#"}
        target="_blank"
        className="inline-block bg-black text-white px-4 py-2 rounded"
      >
        访问官网
      </a>

    </div>
  );
}