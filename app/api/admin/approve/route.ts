export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

const INVALID_CATEGORY_SLUGS = new Set([
  "category",
  "categories",
  "uncategorized",
  "unknown",
  "分类",
  "未分类",
]);

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function slugify(input: string) {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[’'"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[()（）[\]【】]/g, " ")
    .replace(/[\/\\|]+/g, " ")
    .replace(/,|，|、/g, " ")
    // 保留：中文、英文、数字、空格、连字符
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function normalizeSingleCategoryName(raw: string) {
  const value = normalizeSpaces(raw || "");

  if (!value) {
    throw new Error("分类不能为空");
  }

  // 禁止组合分类：聊天助手 / 视频生成、聊天助手, 视频生成、聊天助手、视频生成
  if (/[\/\\|]+/.test(value) || /,|，|、/.test(value)) {
    throw new Error(
      "分类只能填写一个主分类，不能填写“聊天助手 / 视频生成”这种组合值"
    );
  }

  const lower = value.toLowerCase();

  if (
    lower === "category" ||
    lower === "categories" ||
    lower === "uncategorized" ||
    lower === "unknown"
  ) {
    throw new Error("分类值无效，请填写真实分类名称");
  }

  return value;
}

function buildCategorySlug(raw: string) {
  const name = normalizeSingleCategoryName(raw);
  const slug = slugify(name);

  if (!slug) {
    throw new Error(`分类 slug 生成失败：${name}`);
  }

  if (INVALID_CATEGORY_SLUGS.has(slug)) {
    throw new Error(`分类 slug 非法：${slug}`);
  }

  return slug;
}

async function findOrCreateCategory(rawCategory: string) {
  const name = normalizeSingleCategoryName(rawCategory);
  const slug = buildCategorySlug(name);

  const bySlug = await prisma.category.findUnique({
    where: { slug },
  });

  if (bySlug) {
    return bySlug;
  }

  const byName = await prisma.category.findFirst({
    where: { name },
  });

  if (byName) {
    return byName;
  }

  return prisma.category.create({
    data: {
      name,
      slug,
      order: 0,
    },
  });
}

function slugFromWebsite(website: string) {
  try {
    const url = new URL(website);
    const hostParts = url.hostname.replace(/^www\./, "").split(".");
    const mainHost =
      hostParts.length >= 2 ? hostParts.slice(0, -1).join("-") : hostParts[0];

    const pathLast =
      url.pathname.split("/").filter(Boolean).slice(-1)[0] ?? "";

    return slugify([mainHost, pathLast].filter(Boolean).join("-"));
  } catch {
    return "";
  }
}

function parseTags(input: string) {
  return Array.from(
    new Set(
      input
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 10)
    )
  );
}

function normalizeWebsite(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function resolveIconUrl(iconHref: string, website: string) {
  try {
    return new URL(iconHref, website).toString();
  } catch {
    return "";
  }
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AI-Toolsss-Bot/1.0; +https://y78bq.dpdns.org)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`fetch html failed: ${res.status}`);
  }

  return res.text();
}

function extractIconHrefFromHtml(html: string) {
  const patterns = [
    /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]+rel=["'][^"']*shortcut icon[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*>/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*shortcut icon[^"']*["'][^>]*>/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const href = match?.[1]?.trim();
    if (href) return href;
  }

  return "";
}

function getFileExtensionFromContentType(contentType: string | null) {
  if (!contentType) return "png";

  const type = contentType.toLowerCase();

  if (type.includes("image/png")) return "png";
  if (type.includes("image/jpeg")) return "jpg";
  if (type.includes("image/jpg")) return "jpg";
  if (type.includes("image/webp")) return "webp";
  if (type.includes("image/svg+xml")) return "svg";
  if (type.includes("image/x-icon")) return "ico";
  if (type.includes("image/vnd.microsoft.icon")) return "ico";
  if (type.includes("image/gif")) return "gif";

  return "png";
}

async function tryDownloadIcon(iconUrl: string) {
  if (!iconUrl) return null;

  const res = await fetch(iconUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AI-Toolsss-Bot/1.0; +https://y78bq.dpdns.org)",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      Referer: iconUrl,
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  const contentType = res.headers.get("content-type");
  const arrayBuffer = await res.arrayBuffer();

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return null;
  }

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}

async function fetchWebsiteIcon(website: string) {
  try {
    const html = await fetchHtml(website);
    const iconHref = extractIconHrefFromHtml(html);

    if (iconHref) {
      const iconUrl = resolveIconUrl(iconHref, website);
      const iconFile = await tryDownloadIcon(iconUrl);
      if (iconFile) return iconFile;
    }
  } catch {
    // ignore html parse failure, fallback below
  }

  try {
    const faviconUrl = new URL("/favicon.ico", website).toString();
    const iconFile = await tryDownloadIcon(faviconUrl);
    if (iconFile) return iconFile;
  } catch {
    // ignore fallback failure
  }

  return null;
}

async function uploadLogoToBlob(website: string, toolName: string) {
  try {
    const iconFile = await fetchWebsiteIcon(website);
    if (!iconFile) return "";

    const ext = getFileExtensionFromContentType(iconFile.contentType);
    const baseName =
      slugFromWebsite(website) || slugify(toolName) || `tool-${Date.now()}`;

    const path = `tool-logos/${baseName}.${ext}`;

    const blob = await put(path, iconFile.buffer, {
      access: "public",
      contentType: iconFile.contentType || "image/png",
      addRandomSuffix: true,
    });

    return blob.url;
  } catch (error) {
    console.error("upload logo to blob failed:", error);
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const ok = await isAdminAuthenticated();

    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const id = String(body?.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id required" },
        { status: 400 }
      );
    }

    const sub = await prisma.submission.findUnique({
      where: { id },
    });

    if (!sub) {
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 }
      );
    }

    if (sub.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: "该提交已处理，不能重复通过" },
        { status: 400 }
      );
    }

    const normalizedWebsite = normalizeWebsite(sub.website);

    const existingToolByWebsite = await prisma.tool.findFirst({
      where: {
        website: normalizedWebsite,
      },
    });

    if (existingToolByWebsite) {
      await prisma.submission.update({
        where: { id },
        data: { status: "approved" },
      });

      return NextResponse.json({
        ok: true,
        toolId: existingToolByWebsite.id,
        toolSlug: existingToolByWebsite.slug,
        message: "该工具已存在，已直接标记为通过",
      });
    }

    const existingToolByName = await prisma.tool.findFirst({
      where: {
        name: sub.name,
      },
    });

    if (existingToolByName) {
      await prisma.submission.update({
        where: { id },
        data: { status: "approved" },
      });

      return NextResponse.json({
        ok: true,
        toolId: existingToolByName.id,
        toolSlug: existingToolByName.slug,
        message: "同名工具已存在，已直接标记为通过",
      });
    }

    const category = await findOrCreateCategory(sub.category);

    const base =
      slugFromWebsite(normalizedWebsite) ||
      slugify(sub.name) ||
      `tool-${Date.now()}`;

    let slug = base;

    for (let i = 0; i < 20; i++) {
      const exists = await prisma.tool.findUnique({
        where: { slug },
      });

      if (!exists) break;
      slug = `${base}-${i + 2}`;
    }

    const parsedTags = parseTags(sub.tags);

    const logoUrl = await uploadLogoToBlob(normalizedWebsite, sub.name);

    const tool = await prisma.tool.create({
  data: {
    name: sub.name,
    slug,
    description: sub.description,
    content: sub.description,
    website: normalizedWebsite,
    pricing: "unknown",
    featured: false,
    clicks: 0,
    logoUrl,
    screenshots: "",
    searchText: `${sub.name} ${sub.description} ${sub.category} ${sub.tags}`,
    categoryId: category.id,
  },
});

    for (const tagName of parsedTags) {
      const tagSlug = slugify(tagName) || `tag-${Date.now()}`;

      const tag = await prisma.tag.upsert({
        where: { slug: tagSlug },
        update: { name: tagName },
        create: {
          name: tagName,
          slug: tagSlug,
        },
      });

      await prisma.toolTag.upsert({
        where: {
          toolId_tagId: {
            toolId: tool.id,
            tagId: tag.id,
          },
        },
        update: {},
        create: {
          toolId: tool.id,
          tagId: tag.id,
        },
      });
    }

    await prisma.submission.update({
      where: { id },
      data: { status: "approved" },
    });

    return NextResponse.json({
      ok: true,
      toolId: tool.id,
      toolSlug: tool.slug,
      logoUrl: tool.logoUrl,
      message: "已创建新工具",
    });
  } catch (error) {
    console.error("approve api error:", error);

    const message =
      error instanceof Error ? error.message : "通过失败，请稍后重试";

    return NextResponse.json(
      { ok: false, error: message || "通过失败，请稍后重试" },
      { status: 500 }
    );
  }
}