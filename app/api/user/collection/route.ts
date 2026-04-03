// app/api/user/collection/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

/**
 * 获取收藏列表 (GET) & 添加收藏 (POST)
 */

// 1. 获取当前用户的所有收藏
export async function GET() {
  try {
    const sessionToken = cookies().get("session_token")?.value;
    if (!sessionToken) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const session = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    }

    const collections = await prisma.collection.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: collections });
  } catch (error) {
    return NextResponse.json({ error: "获取收藏失败" }, { status: 500 });
  }
}

// 2. 添加一个新的收藏
export async function POST(req: NextRequest) {
  try {
    const sessionToken = cookies().get("session_token")?.value;
    if (!sessionToken) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const session = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, coverUrl, sourceUrl, platform, tags, metaJson } = body;

    // 必填项检查
    if (!title || !sourceUrl) {
      return NextResponse.json({ error: "标题和链接必填" }, { status: 400 });
    }

    const newCollection = await prisma.collection.create({
      data: {
        userId: session.userId,
        title,
        description,
        coverUrl,
        sourceUrl,
        platform: platform || "website",
        tags: tags || "",
        metaJson: metaJson ? JSON.stringify(metaJson) : "{}",
      },
    });

    return NextResponse.json({ success: true, data: newCollection });
  } catch (error) {
    console.error("[COLLECTION_POST_ERROR]", error);
    return NextResponse.json({ error: "添加收藏失败" }, { status: 500 });
  }
}