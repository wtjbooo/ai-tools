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

function buildSafeCategorySlug(name: string) {
  const trimmedName = name.trim();
  const englishSlug = slugify(trimmedName);

  if (englishSlug) {
    return englishSlug;
  }

  return `category-${Date.now()}`;
}

async function findOrCreateCategoryByName(categoryName: string) {
  const trimmedName = categoryName.trim();

  const existingByName = await prisma.category.findFirst({
    where: {
      name: trimmedName,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existingByName) {
    return existingByName;
  }

  const baseSlug = buildSafeCategorySlug(trimmedName);

  let finalSlug = baseSlug;
  let counter = 1;

  while (true) {
    const exists = await prisma.category.findUnique({
      where: { slug: finalSlug },
      select: { id: true },
    });

    if (!exists) {
      break;
    }

    finalSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return prisma.category.create({
    data: {
      name: trimmedName,
      slug: finalSlug,
      order: 0,
    },
  });
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
    const rawSlug = String(body?.slug ?? "").trim();
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

    if (!rawSlug) {
      return NextResponse.json(
        { ok: false, error: "slug 不能为空" },
        { status: 400 }
      );
    }

    const slug = rawSlug.toLowerCase();

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { ok: false, error: "slug 只能包含小写字母、数字和连字符 -" },
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
      select: { id: true, slug: true },
    });

    if (!tool) {
      return NextResponse.json(
        { ok: false, error: "工具不存在" },
        { status: 404 }
      );
    }

    const existingBySlug = await prisma.tool.findFirst({
      where: {
        slug,
        NOT: { id },
      },
      select: { id: true },
    });

    if (existingBySlug) {
      return NextResponse.json(
        { ok: false, error: "slug 已被其他工具占用" },
        { status: 400 }
      );
    }

    const category = await findOrCreateCategoryByName(categoryName);
    const parsedTags = parseTags(tagsInput);

    await prisma.tool.update({
      where: { id },
      data: {
        name,
        slug,
        website: normalizedWebsite,
        logoUrl,
        description,
        content,
        categoryId: category.id,
        featuredOrder: Number.isFinite(featuredOrderNumber)
          ? Math.floor(featuredOrderNumber)
          : 0,
        searchText: `${name} ${slug} ${description} ${categoryName} ${tagsInput} ${content}`,
      },
    });

    await prisma.toolTag.deleteMany({
      where: { toolId: id },
    });

    for (const tagName of parsedTags) {
      const tagSlugBase = slugify(tagName);
      const safeTagSlug =
        tagSlugBase ||
        `tag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const existingTagByName = await prisma.tag.findFirst({
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
          const exists = await prisma.tag.findUnique({
            where: { slug: finalTagSlug },
            select: { id: true },
          });

          if (!exists) {
            break;
          }

          finalTagSlug = `${safeTagSlug}-${counter}`;
          counter += 1;
        }

        tag = await prisma.tag.create({
          data: {
            name: tagName,
            slug: finalTagSlug,
          },
        });
      }

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