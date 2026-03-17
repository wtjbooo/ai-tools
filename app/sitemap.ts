import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") || "https://y78bq.dpdns.org";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tools, categories] = await Promise.all([
    prisma.tool.findMany({
      where: { isPublished: true },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.category.findMany({
      select: {
        slug: true,
        updatedAt: true,
        tools: {
          where: { isPublished: true },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: undefined,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/submit`,
      lastModified: undefined,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/featured`,
      lastModified: undefined,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  const toolPages: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${SITE_URL}/tool/${tool.slug}`,
    lastModified: tool.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories
    .filter((category) => category.tools.length > 0)
    .map((category) => ({
      url: `${SITE_URL}/category/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [...staticPages, ...categoryPages, ...toolPages];
}