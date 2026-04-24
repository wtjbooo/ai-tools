// app/api/ai/toggle-favorite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // 1. 鉴权：检查用户是否登录
    const sessionToken = cookies().get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "会话已过期" }, { status: 401 });
    }

    // 2. 获取前端传来的任务 ID
    const { taskId } = await req.json();
    if (!taskId) {
      return NextResponse.json({ error: "参数错误：缺少任务ID" }, { status: 400 });
    }

    // 3. 查找这条记录
    const record = await prisma.aIGenerationRecord.findUnique({
      where: { id: taskId },
    });

    if (!record || record.userId !== session.userId) {
      return NextResponse.json({ error: "未找到该记录或权限不足" }, { status: 404 });
    }

    // 4. 🚀 核心逻辑：切换收藏状态 (Toggle)
    // 如果原来是 true 就变成 false，反之亦然
    const updatedRecord = await prisma.aIGenerationRecord.update({
      where: { id: taskId },
      data: {
        isFavorited: !record.isFavorited,
      },
    });

    return NextResponse.json({
      success: true,
      isFavorited: updatedRecord.isFavorited,
      message: updatedRecord.isFavorited ? "已添加至灵感收藏" : "已取消收藏",
    });

  } catch (error) {
    console.error("[TOGGLE_FAVORITE_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}