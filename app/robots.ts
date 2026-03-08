import type { MetadataRoute } from "next";

const baseUrl = "https://y78bq.dpdns.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/tools/",
          "/categories/",
        ],
        disallow: [
          "/admin/",
          "/api/",
          "/search",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}