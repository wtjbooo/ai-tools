export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const catSlug = slugify(sub.category) || "category";

    const category = await prisma.category.upsert({
      where: { slug: catSlug },
      update: { name: sub.category },
      create: {
        name: sub.category,
        slug: catSlug,
        order: 0,
      },
    });

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

    const tool = await prisma.tool.create({
      data: {
        name: sub.name,
        slug,
        description: sub.description,
        content: sub.reason || "",
        website: normalizedWebsite,
        pricing: "unknown",
        featured: false,
        clicks: 0,
        logoUrl: "",
        screenshots: "",
        searchText: `${sub.name} ${sub.description} ${sub.category} ${sub.tags} ${sub.reason}`,
        categoryId: category.id,
      },
    });

    for (const tagName of parsedTags) {
      const tagSlug = slugify(tagName) || "tag";

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
      message: "已创建新工具",
    });
  } catch (error) {
    console.error("approve api error:", error);

    return NextResponse.json(
      { ok: false, error: "通过失败，请稍后重试" },
      { status: 500 }
    );
  }
}