// app/api/user/dashboard/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionToken = cookies().get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "会话无效或已过期" }, { status: 401 });
    }

    const user = session.user;

    // 1. 获取近期轨迹 (最近 3 条生成记录)
    const recentTasks = await prisma.reversePromptTask.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        targetPlatform: true,
        status: true,
        createdAt: true,
        // 这里可以根据你具体的模型定义，加入你想展示的标题/提示词摘要
        promptText: true, 
      },
    });

    // 2. 获取算力配额 (你的 User 表里应该有类似 credits 或 tokens 的字段)
    // 这里我假设你有一个 credits 字段代表当前剩余积分，如果你的字段名不同，请自行修改
    const currentCredits = user.credits ?? 0; 
    const maxCredits = user.isPro ? 1000 : 100; // Pro 1000 额度，普通 100 额度（可根据你的业务调整）
    
    // 如果剩余积分大于最大积分（比如充值叠加了），计算使用量时需要处理一下
    const usedCredits = Math.max(0, maxCredits - currentCredits);

    // 构造友好的时间显示
    const formattedTasks = recentTasks.map(task => {
      const now = new Date();
      const taskDate = new Date(task.createdAt);
      const diffMs = now.getTime() - taskDate.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      
      let timeStr = "";
      if (diffHrs < 1) timeStr = "刚刚";
      else if (diffHrs < 24) timeStr = `${diffHrs} 小时前`;
      else if (diffHrs < 48) timeStr = "昨天";
      else timeStr = `${Math.floor(diffHrs / 24)} 天前`;

      return {
        id: task.id,
        // 如果没有生成结果摘要，就显示默认名称
        title: task.promptText ? task.promptText.slice(0, 20) + "..." : "AI 推理任务", 
        type: "video", // 假设默认都是视频相关的反推
        time: timeStr,
        platform: task.targetPlatform || "Sora",
      };
    });

    return NextResponse.json({
      quota: {
        used: usedCredits,
        total: maxCredits,
        remaining: currentCredits
      },
      recentActivities: formattedTasks,
    });

  } catch (error) {
    console.error("[DASHBOARD_GET_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}