import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeWebsite(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const website = normalizeWebsite(String(body.website ?? ""));
    const description = String(body.description ?? "").trim();
    const rawCategory = String(body.category ?? "");
    const tags = String(body.tags ?? "").trim();
    const contact = String(body.contact ?? "").trim();
    const reason = String(body.reason ?? "").trim();
    
    // 👇 新增：接收前端传来的 Markdown 长文本
    const content = String(body.content ?? "").trim();
    const tutorial = String(body.tutorial ?? "").trim();
    // 👆

    let category = "";

    try {
      category = normalizeSingleCategoryName(rawCategory);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "分类格式不正确",
        },
        { status: 400 }
      );
    }

    if (!name || !website || !description || !category) {
      return NextResponse.json(
        { error: "请填写完整的工具名称、官网链接、一句话简介和分类" },
        { status: 400 }
      );
    }

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "工具名称长度需在 2 到 100 个字符之间" },
        { status: 400 }
      );
    }

    if (!isValidHttpUrl(website)) {
      return NextResponse.json(
        { error: "官网链接格式不正确，请填写完整的 http 或 https 地址" },
        { status: 400 }
      );
    }

    if (description.length < 10 || description.length > 300) {
      return NextResponse.json(
        { error: "一句话简介长度需在 10 到 300 个字符之间" },
        { status: 400 }
      );
    }

    if (category.length < 2 || category.length > 50) {
      return NextResponse.json(
        { error: "分类长度需在 2 到 50 个字符之间" },
        { status: 400 }
      );
    }

    if (tags.length > 200) {
      return NextResponse.json(
        { error: "标签内容过长，请控制在 200 个字符以内" },
        { status: 400 }
      );
    }

    if (contact.length > 100) {
      return NextResponse.json(
        { error: "联系方式过长，请控制在 100 个字符以内" },
        { status: 400 }
      );
    }

    if (reason.length > 1000) {
      return NextResponse.json(
        { error: "补充说明过长，请控制在 1000 个字符以内" },
        { status: 400 }
      );
    }

    // 1) 正式已收录工具：禁止重复提交
    const existingToolByWebsite = await prisma.tool.findFirst({
      where: {
        website,
      },
    });

    if (existingToolByWebsite) {
      return NextResponse.json(
        { error: "该工具已被正式收录，请勿重复提交" },
        { status: 400 }
      );
    }

    // 2) 只拦截待审核 submission；已拒绝的允许重新提交
    const existingPendingByWebsite = await prisma.submission.findFirst({
      where: {
        website,
        status: "pending",
      },
    });

    if (existingPendingByWebsite) {
      return NextResponse.json(
        { error: "该官网链接已存在待审核记录，请勿重复提交" },
        { status: 400 }
      );
    }

    const existingPendingByName = await prisma.submission.findFirst({
      where: {
        name,
        status: "pending",
      },
    });

    if (existingPendingByName) {
      return NextResponse.json(
        { error: "该工具名称已存在待审核记录，请勿重复提交" },
        { status: 400 }
      );
    }

    await prisma.submission.create({
      data: {
        name,
        website,
        description,
        category,
        tags,
        contact,
        reason,
        // 👇 新增：将接收到的 Markdown 数据存入数据库！
        content,
        tutorial,
        // 👆
        status: "pending",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "提交成功，我们会尽快审核并收录。",
    });
  } catch (error) {
    console.error("submit api error:", error);

    return NextResponse.json(
      { error: "服务器开小差了，请稍后再试" },
      { status: 500 }
    );
  }
}