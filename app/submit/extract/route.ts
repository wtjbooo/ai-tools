import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return "";
  return normalizeText(stripHtml(match[1]));
}

function extractMetaByPatterns(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const value = normalizeText(stripHtml(match[1]));
      if (value) return value;
    }
  }
  return "";
}

function extractMetaDescription(html: string) {
  return extractMetaByPatterns(html, [
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
    /<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
    /<meta[^>]+content=["']([\s\S]*?)["'][^>]+property=["']og:description["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
    /<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']twitter:description["'][^>]*>/i,
  ]);
}

function extractOgTitle(html: string) {
  return extractMetaByPatterns(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
    /<meta[^>]+content=["']([\s\S]*?)["'][^>]+property=["']og:title["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
    /<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']twitter:title["'][^>]*>/i,
  ]);
}

function cleanupTitle(title: string) {
  const value = normalizeText(title);
  if (!value) return "";

  const separators = [" | ", " - ", " – ", " — ", " · ", "_"];
  for (const sep of separators) {
    if (value.includes(sep)) {
      const first = normalizeText(value.split(sep)[0] || "");
      if (first.length >= 2) return first;
    }
  }

  return value;
}

function truncateDescription(value: string, max = 160) {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const website = String(body?.website ?? "").trim();

    if (!website) {
      return NextResponse.json(
        { ok: false, error: "请先填写官网链接" },
        { status: 400 }
      );
    }

    let url: URL;
    try {
      url = new URL(website);
    } catch {
      return NextResponse.json(
        { ok: false, error: "官网链接格式不正确" },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      return NextResponse.json(
        { ok: false, error: "只支持 http 或 https 链接" },
        { status: 400 }
      );
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AI-Tools-Directory/1.0; +https://y78bq.dpdns.org)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "网站暂时无法访问，无法自动获取信息" },
        { status: 400 }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return NextResponse.json(
        { ok: false, error: "目标链接不是普通网页，无法自动获取信息" },
        { status: 400 }
      );
    }

    const html = await res.text();

    const rawTitle = extractTitle(html);
    const ogTitle = extractOgTitle(html);
    const rawDescription = extractMetaDescription(html);

    const name = cleanupTitle(rawTitle || ogTitle);
    const description = truncateDescription(rawDescription, 160);

    if (!name && !description) {
      return NextResponse.json(
        {
          ok: false,
          error: "未自动提取到有效标题或简介，你仍然可以手动填写后提交。",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        name,
        description,
      },
    });
  } catch (error) {
    console.error("extract submit info error:", error);
    return NextResponse.json(
      { ok: false, error: "自动获取失败，你仍然可以手动填写后提交。" },
      { status: 500 }
    );
  }
}