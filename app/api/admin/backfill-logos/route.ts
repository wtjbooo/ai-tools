export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

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
    // ignore and fallback
  }

  try {
    const faviconUrl = new URL("/favicon.ico", website).toString();
    const iconFile = await tryDownloadIcon(faviconUrl);
    if (iconFile) return iconFile;
  } catch {
    // ignore fallback
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
    const rawLimit = Number(body?.limit ?? 5);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(50, rawLimit))
      : 5;

    const tools = await prisma.tool.findMany({
      where: {
        isPublished: true,
        logoUrl: "",
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

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

        const logoUrl = await uploadLogoToBlob(website, tool.name);

        if (!logoUrl) {
          logs.push(`未抓到图标：${tool.name}`);
          skipped += 1;
          continue;
        }

        await prisma.tool.update({
          where: { id: tool.id },
          data: { logoUrl },
        });

        logs.push(`成功写入 logoUrl：${tool.name}`);
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