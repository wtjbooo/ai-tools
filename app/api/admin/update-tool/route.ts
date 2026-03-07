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

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
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
    const name = String(body?.name ?? "").trim();
    const website = normalizeWebsite(String(body?.website ?? ""));
    const description = String(body?.description ?? "").trim();
    const content = String(body?.content ?? "").trim();
    const category = String(body?.category ?? "").trim();
    const tags = String(body?.tags ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id required" },
        { status: 400 }
      );
    }

    if (!name || !website || !description || !category) {
      return NextResponse.json(
        { ok: false, error: "请填写完整的工具名称、官网链接、一句话简介和分类" },
        { status: 400 }
      );
    }

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { ok: false, error: "工具名称长度需在 2 到 100 个字符之间" },
        { status: 400 }
      );
    }

    if (!isValidHttpUrl(website)) {
      return NextResponse.json(
        { ok: false, error: "官网链接格式不正确，请填写完整的 http 或 https 地址" },
        { status: 400 }
      );
    }

    if (description.length < 10 || description.length > 300) {
      return NextResponse.json(
        { ok: false, error: "一句话简介长度需在 10 到 300 个字符之间" },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { ok: false, error: "详细介绍过长，请控制在 5000 个字符以内" },
        { status: 400 }
      );
    }

    if (category.length < 2 || category.length > 50) {
      return NextResponse.json(
        { ok: false, error: "分类长度需在 2 到 50 个字符之间" },
        { status: 400 }
      );
    }

    if (tags.length > 200) {
      return NextResponse.json(
        { ok: false, error: "标签内容过长，请控制在 200 个字符以内" },
        { status: 400 }
      );
    }

    const tool = await prisma.tool.findUnique({
      where: { id },
      include: {
        tags: true,
      },
    });

    if (!tool) {
      return NextResponse.json(
        { ok: false, error: "tool not found" },
        { status: 404 }
      );
    }

    const categorySlug = slugify(category) || "category";

    const categoryRow = await prisma.category.upsert({
      where: { slug: categorySlug },
      update: { name: category },
      create: {
        name: category,
        slug: categorySlug,
        order: 0,
      },
    });

    await prisma.tool.update({
      where: { id },
      data: {
        name,
        website,
        description,
        content,
        categoryId: categoryRow.id,
        searchText: `${name} ${description} ${category} ${tags} ${content}`,
      },
    });

    await prisma.toolTag.deleteMany({
      where: { toolId: id },
    });

    const parsedTags = parseTags(tags);

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

      await prisma.toolTag.create({
        data: {
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
    console.error("update tool api error:", error);

    return NextResponse.json(
      { ok: false, error: "保存失败，请稍后重试" },
      { status: 500 }
    );
  }
}