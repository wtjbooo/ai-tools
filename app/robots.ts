import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") || "https://xaira.top";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/tool/",
          "/category/",
          "/featured",
          "/popular",
          "/latest",
          "/submit",
          "/about",
          "/guidelines",
          "/business",
          "/privacy",
          "/terms",
        ],
        disallow: ["/admin/", "/api/", "/search"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}