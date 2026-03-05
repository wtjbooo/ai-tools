import { prisma } from "@/lib/db";

export default async function sitemap() {

  const tools = await prisma.tool.findMany({
    where: {
      isPublished: true
    },
    select: {
      slug: true,
      updatedAt: true
    }
  });

  const toolUrls = tools.map((tool) => ({
    url: `https://ai.y78bq.dpdns.org/tool/${tool.slug}`,
    lastModified: tool.updatedAt,
  }));

  return [
    {
      url: "https://ai.y78bq.dpdns.org",
      lastModified: new Date(),
    },
    ...toolUrls,
  ];
}