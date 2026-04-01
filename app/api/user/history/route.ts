import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma"; // 确保这里的 prisma 引入路径正确

export async function GET() {
  try {
    // 1. 获取当前登录用户的 Session
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

    // 2. 从数据库中查询该用户的反向提示词历史
    const tasks = await prisma.reversePromptTask.findMany({
      where: { 
        userId: session.userId,
        // 可选：如果只想展示成功的任务，可以加上 status: "completed"
      },
      orderBy: { 
        createdAt: "desc" 
      },
      take: 30, // 限制最多展示最近 30 条，保证弹窗的流畅性
      select: {
        id: true,
        status: true,
        targetPlatform: true,
        createdAt: true,
        // 这里为了轻量化，不返回庞大的 resultJson，只返回必要信息
      }
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("[HISTORY_FETCH_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}