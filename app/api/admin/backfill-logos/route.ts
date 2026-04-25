export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// 初始化 R2 (S3) 客户端
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/[^a-z0-9\-]+/g, "")
    .replace(/\-+/g, "-")
    .replace(/^\-+|\-+$/g, "")
    .slice(0, 60);
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

// 检查是否已经是 R2 的链接 (或者是旧的 blob 链接)
function isCloudLogoUrl(url: string | null | undefined) {
  if (!url) return false;
  const r2Domain = process.env.R2_PUBLIC_DOMAIN?.replace(/^https?:\/\//, "") || "r2.dev";
  return url.includes(r2Domain) || url.includes("blob.vercel-storage.com");
}

function withTimeoutSignal(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

async function fetchHtml(url: string) {
  const timeout = withTimeoutSignal(12000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AI-Toolsss-Bot/1.0; +https://y78bq.dpdns.org)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      cache: "no-store",
      signal: timeout.signal,
    });

    if (!res.ok) {
      throw new Error(`fetch html failed: ${res.status}`);
    }

    return res.text();
  } finally {
    timeout.clear();
  }
}

function extractAttribute(tag: string, attribute: string) {
  const regex = new RegExp(`\\b${attribute}=["']([^"']+)["']`, "i");
  return tag.match(regex)?.[1]?.trim() ?? "";
}

function extractIconHrefsFromHtml(html: string) {
  const hrefs: string[] = [];
  const linkTagPattern = /<link\b[^>]*>/gi;
  const linkTags = html.match(linkTagPattern) ?? [];

  for (const tag of linkTags) {
    const rel = extractAttribute(tag, "rel").toLowerCase();
    const href = extractAttribute(tag, "href");

    if (!href) continue;

    const isIconRel =
      rel.includes("icon") ||
      rel.includes("apple-touch-icon") ||
      rel.includes("shortcut icon") ||
      rel.includes("mask-icon");

    if (isIconRel) {
      hrefs.push(href);
    }
  }

  return Array.from(new Set(hrefs));
}

function extractMetaImageCandidatesFromHtml(html: string) {
  const results: string[] = [];
  const metaTagPattern = /<meta\b[^>]*>/gi;
  const metaTags = html.match(metaTagPattern) ?? [];

  for (const tag of metaTags) {
    const property = extractAttribute(tag, "property").toLowerCase();
    const name = extractAttribute(tag, "name").toLowerCase();
    const itemProp = extractAttribute(tag, "itemprop").toLowerCase();
    const content = extractAttribute(tag, "content");

    if (!content) continue;

    const isImageMeta =
      property === "og:image" ||
      property === "og:image:url" ||
      property === "og:image:secure_url" ||
      name === "twitter:image" ||
      name === "twitter:image:src" ||
      name === "msapplication-tileimage" ||
      name === "image" ||
      name === "thumbnail" ||
      itemProp === "image";

    if (isImageMeta) {
      results.push(content);
    }
  }

  return Array.from(new Set(results));
}

function extractLikelyLogoImgCandidatesFromHtml(html: string) {
  const results: string[] = [];
  const imgTagPattern = /<img\b[^>]*>/gi;
  const imgTags = html.match(imgTagPattern) ?? [];

  for (const tag of imgTags) {
    const src = extractAttribute(tag, "src");
    if (!src) continue;

    const alt = extractAttribute(tag, "alt").toLowerCase();
    const className = extractAttribute(tag, "class").toLowerCase();
    const id = extractAttribute(tag, "id").toLowerCase();

    const signals = [alt, className, id].join(" ");
    const isLikelyLogo =
      signals.includes("logo") ||
      signals.includes("brand") ||
      signals.includes("navbar") ||
      signals.includes("header") ||
      signals.includes("site") ||
      signals.includes("icon");

    if (isLikelyLogo) {
      results.push(src);
    }
  }

  return Array.from(new Set(results));
}

function getCommonIconCandidates(website: string) {
  try {
    const url = new URL(website);
    const origin = url.origin;

    const candidates = [
      "/favicon.ico",
      "/favicon.png",
      "/favicon.svg",
      "/apple-touch-icon.png",
      "/apple-touch-icon-precomposed.png",
      "/icon.png",
      "/logo.png",
      "/logo.svg",
      "/static/favicon.ico",
      "/static/logo.png",
      "/static/logo.svg",
      "/assets/favicon.ico",
      "/assets/logo.png",
      "/assets/logo.svg",
    ];

    return candidates.map((path) => `${origin}${path}`);
  } catch {
    return [];
  }
}

function getExternalFaviconCandidates(website: string) {
  try {
    const url = new URL(website);
    const origin = url.origin;
    const host = url.hostname;

    return [
      `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(origin)}`,
      `https://icon.horse/icon/${host}`,
    ];
  } catch {
    return [];
  }
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

function isLikelyImageContentType(contentType: string | null) {
  if (!contentType) return false;
  return contentType.toLowerCase().startsWith("image/");
}

async function tryDownloadIcon(iconUrl: string, refererWebsite: string) {
  if (!iconUrl || iconUrl.startsWith("data:")) return null;

  const timeout = withTimeoutSignal(12000);

  try {
    const res = await fetch(iconUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AI-Toolsss-Bot/1.0; +https://y78bq.dpdns.org)",
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: refererWebsite,
      },
      redirect: "follow",
      cache: "no-store",
      signal: timeout.signal,
    });

    if (!res.ok) {
      return null;
    }

    const contentType = res.headers.get("content-type");

    if (!isLikelyImageContentType(contentType)) {
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return null;
    }

    return {
      buffer: Buffer.from(arrayBuffer),
      contentType,
    };
  } catch {
    return null;
  } finally {
    timeout.clear();
  }
}

async function fetchWebsiteIcon(website: string) {
  const primaryCandidates: string[] = [];
  const secondaryCandidates: string[] = [];

  try {
    const html = await fetchHtml(website);

    for (const href of extractIconHrefsFromHtml(html)) {
      const resolved = resolveIconUrl(href, website);
      if (resolved) {
        primaryCandidates.push(resolved);
      }
    }

    for (const href of extractMetaImageCandidatesFromHtml(html)) {
      const resolved = resolveIconUrl(href, website);
      if (resolved) {
        secondaryCandidates.push(resolved);
      }
    }

    for (const href of extractLikelyLogoImgCandidatesFromHtml(html)) {
      const resolved = resolveIconUrl(href, website);
      if (resolved) {
        secondaryCandidates.push(resolved);
      }
    }
  } catch {
    // ignore html fetch failure and continue fallback
  }

  for (const fallbackUrl of getCommonIconCandidates(website)) {
    primaryCandidates.push(fallbackUrl);
  }

  for (const externalUrl of getExternalFaviconCandidates(website)) {
    secondaryCandidates.push(externalUrl);
  }

  const uniquePrimary = Array.from(new Set(primaryCandidates));
  const uniqueSecondary = Array.from(new Set(secondaryCandidates));

  for (const iconUrl of [...uniquePrimary, ...uniqueSecondary]) {
    const iconFile = await tryDownloadIcon(iconUrl, website);
    if (iconFile) {
      return iconFile;
    }
  }

  return null;
}

// 🚀 核心改动：上传到 R2 的逻辑
async function uploadLogoToR2(website: string, toolName: string) {
  try {
    const iconFile = await fetchWebsiteIcon(website);
    if (!iconFile) return "";

    const ext = getFileExtensionFromContentType(iconFile.contentType);
    const baseName =
      slugFromWebsite(website) || slugify(toolName) || `tool`;
      
    // 手动添加 Date.now() 作为随机后缀，防止同名覆盖
    const fileName = `${baseName}-${Date.now()}.${ext}`;
    
    // 放入你要求的 "ai-tool-logos" 文件夹
    const path = `ai-tool-logos/${fileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: path,
        Body: iconFile.buffer,
        ContentType: iconFile.contentType || "image/png",
      })
    );

    // 拼接公开访问的 URL
    const publicDomain = process.env.R2_PUBLIC_DOMAIN;
    if (!publicDomain) {
      console.error("请在 .env 中配置 R2_PUBLIC_DOMAIN");
      return "";
    }
    
    // 确保域名和路径拼接正确（去除结尾多余的斜杠）
    const cleanDomain = publicDomain.replace(/\/+$/, "");
    return `${cleanDomain}/${path}`;
  } catch (error) {
    console.error("upload logo to R2 failed:", error);
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
    const rawLimit = Number(body?.limit ?? 5);
    const force = Boolean(body?.force);

    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(50, rawLimit))
      : 5;

    const candidates = await prisma.tool.findMany({
      where: {
        isPublished: true,
      },
      orderBy: { createdAt: "desc" },
      take: force ? 200 : limit,
    });

    const tools = candidates
      .filter((tool) => {
        const logoUrl = tool.logoUrl ?? "";

        if (!force) {
          return logoUrl === "";
        }

        // 核心改动：检查是否是 R2 或旧的 Blob 链接
        return logoUrl === "" || !isCloudLogoUrl(logoUrl);
      })
      .slice(0, limit);

    let success = 0;
    let skipped = 0;
    let failed = 0;
    const logs: string[] = [];

    for (const tool of tools) {
      try {
        const website = normalizeWebsite(tool.website ?? "");

        if (!website) {
          logs.push(`跳过 ${tool.name}：没有 website`);
          skipped += 1;
          continue;
        }

        logs.push(`开始处理：${tool.name}`);

        // 核心改动：调用 R2 上传函数
        const logoUrl = await uploadLogoToR2(website, tool.name);

        if (!logoUrl) {
          logs.push(`未抓到图标：${tool.name}`);
          skipped += 1;
          continue;
        }

        await prisma.tool.update({
          where: { id: tool.id },
          data: { logoUrl },
        });

        logs.push(`成功写入 R2 logoUrl：${tool.name}`);
        success += 1;
      } catch (error) {
        console.error(`backfill logo failed for ${tool.name}:`, error);
        logs.push(`处理失败：${tool.name}`);
        failed += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      processed: tools.length,
      success,
      skipped,
      failed,
      force,
      logs,
    });
  } catch (error) {
    console.error("backfill logos api error:", error);

    return NextResponse.json(
      { ok: false, error: "批量补 logo 失败，请稍后重试" },
      { status: 500 }
    );
  }
}