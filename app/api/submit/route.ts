import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function normalizeWebsite(url: string) {
  return url.trim().replace(/\/+$/, ""); // 去掉末尾 /
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const websiteRaw = String(body.website ?? "").trim();
  const description = String(body.description ?? "").trim();
  const category = String(body.category ?? "").trim();
  const tags = String(body.tags ?? "").trim();
  const contact = String(body.contact ?? "").trim();

  if (!name || !websiteRaw || !description || !category) {
    return NextResponse.json(
      { ok: false, error: "name/website/description/category 必填" },
      { status: 400 }
    );
  }

  // 校验 URL
  let website: string;
  try {
    // 这里用 URL 解析一下，保证是合法链接
    const u = new URL(websiteRaw);
    website = normalizeWebsite(u.toString());
  } catch {
    return NextResponse.json({ ok: false, error: "website 不是有效链接" }, { status: 400 });
  }

  // ✅ 防重复 1：已经收录（Tool 表存在同网站）
 const variants = [website, website + "/"];

// ✅ 防重复 1：Tool 表里已经有（带/不带都算）
const toolExists = await prisma.tool.findFirst({
  where: { website: { in: variants } },
  select: { id: true, slug: true, name: true },
});

if (toolExists) {
  return NextResponse.json(
    { ok: false, error: `该网站已收录：${toolExists.name}（/tool/${toolExists.slug}）` },
    { status: 409 }
  );
}

// ✅ 防重复 2：Submission 里 pending 已存在（带/不带都算）
const pendingExists = await prisma.submission.findFirst({
  where: {
    status: "pending",
    website: { in: variants },
  },
  select: { id: true },
});

if (pendingExists) {
  return NextResponse.json(
    { ok: false, error: "该网站已提交且正在审核中，请勿重复提交" },
    { status: 409 }
  );
}

  // ✅ 写入 Submission
  const submission = await prisma.submission.create({
    data: {
      name,
      website,
      description,
      category,
      tags,
      contact,
      status: "pending",
    },
  });

  return NextResponse.json({ ok: true, id: submission.id });
}