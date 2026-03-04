export const runtime = "nodejs";
export const dynamic = "force-dynamic";


import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "../_guard";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .slice(0, 60);
}

export async function POST(req: Request) {
  try {
    requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const sub = await prisma.submission.findUnique({ where: { id } });
  if (!sub) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  // category: 用 name 匹配/创建
  const catSlug = slugify(sub.category) || "category";
  const category = await prisma.category.upsert({
    where: { slug: catSlug },
    update: { name: sub.category },
    create: { name: sub.category, slug: catSlug, order: 0 },
  });

  // tool slug: name slugify + 去重
  let base = slugify(sub.name) || "tool";
  let slug = base;
  for (let i = 0; i < 20; i++) {
    const exists = await prisma.tool.findUnique({ where: { slug } });
    if (!exists) break;
    slug = `${base}-${i + 2}`;
  }

  const tool = await prisma.tool.create({
    data: {
      name: sub.name,
      slug,
      description: sub.description,
      content: "",
      website: sub.website,
      pricing: "unknown",
      featured: false,
      clicks: 0,
      logoUrl: "",
      screenshots: "",
      searchText: `${sub.name} ${sub.description} ${sub.category} ${sub.tags}`,
      categoryId: category.id,
    },
  });

  await prisma.submission.update({
    where: { id },
    data: { status: "approved" },
  });

  return NextResponse.json({ ok: true, toolId: tool.id, toolSlug: tool.slug });
}