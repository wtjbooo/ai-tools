// app/api/user/history/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

/**
 * 获取当前登录用户的生成历史记录
 * 对应前端 GET /api/user/history
 */
export async function GET() {
  try {
    // 1. 验证用户登录状态
    const sessionToken = cookies().get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    }

    // 2. 查询该用户的历史任务
    // 按创建时间倒序排列，确保最新的在最前面
    const history = await prisma.reversePromptTask.findMany({
      where: {
        userId: session.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 3. 返回查询结果
    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("[USER_HISTORY_GET_ERROR]", error);
    return NextResponse.json({ error: "获取历史记录失败" }, { status: 500 });
  }
}