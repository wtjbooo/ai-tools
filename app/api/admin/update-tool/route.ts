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

function normalizeWebsite(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function parseTags(input: string) {
  return Array.from(
    new Set(
      input
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20)
    )
  );
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
    const name = String(body?.name ?? "").trim();
    const website = String(body?.website ?? "").trim();
    const logoUrl = String(body?.logoUrl ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const content = String(body?.content ?? "").trim();
    const categoryName = String(body?.category ?? "").trim();
    const tagsInput = String(body?.tags ?? "").trim();

    const featuredOrderRaw = body?.featuredOrder;
    const featuredOrderNumber = Number(featuredOrderRaw);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "缺少工具 id" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "工具名称不能为空" },
        { status: 400 }
      );
    }

    if (!website) {
      return NextResponse.json(
        { ok: false, error: "官网链接不能为空" },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { ok: false, error: "一句话简介不能为空" },
        { status: 400 }
      );
    }

    if (!categoryName) {
      return NextResponse.json(
        { ok: false, error: "分类不能为空" },
        { status: 400 }
      );
    }

    if (
      featuredOrderRaw !== undefined &&
      featuredOrderRaw !== null &&
      (!Number.isFinite(featuredOrderNumber) || featuredOrderNumber < 0)
    ) {
      return NextResponse.json(
        { ok: false, error: "推荐排序必须是大于等于 0 的数字" },
        { status: 400 }
      );
    }

    let normalizedWebsite = "";
    try {
      normalizedWebsite = normalizeWebsite(website);
      new URL(normalizedWebsite);
    } catch {
      return NextResponse.json(
        { ok: false, error: "官网链接格式不正确" },
        { status: 400 }
      );
    }

    if (logoUrl) {
      try {
        new URL(logoUrl);
      } catch {
        return NextResponse.json(
          { ok: false, error: "logoUrl 格式不正确" },
          { status: 400 }
        );
      }
    }

    if (description.length > 300) {
      return NextResponse.json(
        { ok: false, error: "一句话简介不能超过 300 字" },
        { status: 400 }
      );
    }

    if (content.length > 20000) {
      return NextResponse.json(
        { ok: false, error: "详细介绍不能超过 20000 字" },
        { status: 400 }
      );
    }

    if (tagsInput.length > 500) {
      return NextResponse.json(
        { ok: false, error: "标签内容过长" },
        { status: 400 }
      );
    }

    const tool = await prisma.tool.findUnique({
      where: { id },
    });

    if (!tool) {
      return NextResponse.json(
        { ok: false, error: "工具不存在" },
        { status: 404 }
      );
    }

    const categorySlug = slugify(categoryName) || "category";

    const category = await prisma.category.upsert({
      where: { slug: categorySlug },
      update: { name: categoryName },
      create: {
        name: categoryName,
        slug: categorySlug,
        order: 0,
      },
    });

    const parsedTags = parseTags(tagsInput);

    await prisma.tool.update({
      where: { id },
      data: {
        name,
        website: normalizedWebsite,
        logoUrl,
        description,
        content,
        categoryId: category.id,
        featuredOrder: Number.isFinite(featuredOrderNumber)
          ? Math.floor(featuredOrderNumber)
          : 0,
        searchText: `${name} ${description} ${categoryName} ${tagsInput} ${content}`,
      },
    });

    await prisma.toolTag.deleteMany({
      where: { toolId: id },
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
            toolId: id,
            tagId: tag.id,
          },
        },
        update: {},
        create: {
          toolId: id,
          tagId: tag.id,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: "工具保存成功",
    });
  } catch (error) {
    console.error("update-tool api error:", error);

    return NextResponse.json(
      { ok: false, error: "保存失败，请稍后重试" },
      { status: 500 }
    );
  }
}