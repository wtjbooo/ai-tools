export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { put } from "@vercel/blob";
import type { Prisma } from "@prisma/client";
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

async function findOrCreateCategory(
  rawCategory: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  const name = normalizeSingleCategoryName(rawCategory);
  const slug = buildCategorySlug(name);

  const bySlug = await tx.category.findUnique({
    where: { slug },
  });

  if (bySlug) {
    return bySlug;
  }

  const byName = await tx.category.findFirst({
    where: { name },
  });

  if (byName) {
    return byName;
  }

  return tx.category.create({
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

function normalizeTagName(value: string) {
  return normalizeSpaces(value).slice(0, 30);
}

function parseTags(input: string) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawTag of String(input || "").split(/[,，]/)) {
    const tag = normalizeTagName(rawTag);
    if (!tag) continue;

    const key = tag.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(tag);

    if (result.length >= 8) break;
  }

  return result;
}

function normalizeWebsite(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function normalizeDescription(value: string) {
  return normalizeSpaces(value);
}

function normalizeReason(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildToolContentFromSubmission(sub: {
  description: string;
  reason: string | null;
  category: string;
  tags: string;
  name: string;
}) {
  const cleanReason = normalizeReason(sub.reason || "");

  if (cleanReason) {
    return cleanReason;
  }

  const tagText = parseTags(sub.tags).join("、");
  const categoryName = normalizeSingleCategoryName(sub.category);

  const lines = [
    `${sub.name} 是一款归类在「${categoryName}」方向的 AI 工具。`,
    sub.description,
    tagText
      ? `当前可参考的能力标签包括：${tagText}。`
      : `当前页面已整理基础介绍、分类信息与官网入口，方便快速判断是否值得进一步体验。`,
  ];

  return lines.join("\n\n").trim();
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
    const normalizedDescription = normalizeDescription(sub.description);
    const normalizedReason = normalizeReason(sub.reason || "");

    const existingToolByWebsite = await prisma.tool.findFirst({
      where: {
        website: normalizedWebsite,
      },
      select: { id: true, slug: true },
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
      select: { id: true, slug: true },
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

    const parsedTags = parseTags(sub.tags);
    const logoUrl = await uploadLogoToBlob(normalizedWebsite, sub.name);

    const result = await prisma.$transaction(
  async (tx) => {
      const category = await findOrCreateCategory(sub.category, tx);

      const base =
        slugFromWebsite(normalizedWebsite) ||
        slugify(sub.name) ||
        `tool-${Date.now()}`;

      let slug = base;

      for (let i = 0; i < 20; i++) {
        const exists = await tx.tool.findUnique({
          where: { slug },
          select: { id: true },
        });

        if (!exists) break;
        slug = `${base}-${i + 2}`;
      }

      // 尝试使用自动生成的兜底内容，但如果用户填了真正的 Markdown，就优先用真正的！
      const fallbackContent = buildToolContentFromSubmission({
        name: sub.name,
        description: normalizedDescription,
        reason: normalizedReason,
        category: sub.category,
        tags: sub.tags,
      });

      // 👇 核心修复：提取前台真正提交的 Markdown 数据 👇
      // 如果 sub.content 有值就用它，没有就用上面生成的兜底内容
      const finalContent = sub.content ? String(sub.content).trim() : fallbackContent;
      const finalTutorial = sub.tutorial ? String(sub.tutorial).trim() : "";

      const tool = await tx.tool.create({
        data: {
          name: normalizeSpaces(sub.name),
          slug,
          description: normalizedDescription,
          content: finalContent,       // 👈 正式将前台的“产品简介”搬运到工具表
          tutorial: finalTutorial,     // 👈 正式将前台的“使用指南”搬运到工具表
          website: normalizedWebsite,
          pricing: "unknown",
          featured: false,
          clicks: 0,
          outClicks: 0,
          views: 0,
          logoUrl,
          screenshots: "",
          searchText: [
            normalizeSpaces(sub.name),
            normalizedDescription,
            normalizeSingleCategoryName(sub.category),
            parsedTags.join(" "),
            finalContent,              // 👈 让用户能在后台搜索到 Markdown 里的词
            finalTutorial,
          ]
            .join(" ")
            .trim(),
          categoryId: category.id,
        },
      });

      for (const tagName of parsedTags) {
        const tagSlugBase = slugify(tagName);
        const safeTagSlug =
          tagSlugBase ||
          `tag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const existingTagByName = await tx.tag.findFirst({
          where: { name: tagName },
          orderBy: { createdAt: "asc" },
        });

        let tag;

        if (existingTagByName) {
          tag = existingTagByName;
        } else {
          let finalTagSlug = safeTagSlug;
          let counter = 1;

          while (true) {
            const exists = await tx.tag.findUnique({
              where: { slug: finalTagSlug },
              select: { id: true },
            });

            if (!exists) break;

            finalTagSlug = `${safeTagSlug}-${counter}`;
            counter += 1;
          }

          tag = await tx.tag.create({
            data: {
              name: tagName,
              slug: finalTagSlug,
            },
          });
        }

        await tx.toolTag.upsert({
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

      await tx.submission.update({
        where: { id },
        data: { status: "approved" },
      });

          return tool;
  },
  {
    maxWait: 10000,
    timeout: 30000,
  }
);

    return NextResponse.json({
      ok: true,
      toolId: result.id,
      toolSlug: result.slug,
      logoUrl: result.logoUrl,
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
