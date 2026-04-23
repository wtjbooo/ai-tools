// app/api/user/dashboard/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma"; // 确保这里的路径与你的实际 prisma 实例路径一致

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
        // 👈 完美修复 1：将幽灵字段 promptText 替换为真实的 rawResponseText
        rawResponseText: true, 
      },
    });

    // 2. 完美修复 2：彻底接入新版积分制逻辑，同步真实钱包！
    const DAILY_FREE_POINTS = 100; // 与 lib/quota.ts 保持一致
    const now = new Date();
    const lastUsed = user.lastUsedDate;
    let usedCredits = user.freeUsesToday;
    const bonusCredits = user.bonusCredits || 0; // 👈 获取真实的加油包余额

    // 跨天判断：如果最后一次使用时间不是今天，说明今天是全新的，已用积分为 0
    const isToday =
      lastUsed &&
      lastUsed.getDate() === now.getDate() &&
      lastUsed.getMonth() === now.getMonth() &&
      lastUsed.getFullYear() === now.getFullYear();

    if (!isToday) {
      usedCredits = 0; 
    }

    // 🚀 把加油包算进大盘里！
    const baseCredits = user.isPro ? 99999 : DAILY_FREE_POINTS;
    const maxCredits = baseCredits + bonusCredits; // 总额度 = 基础 + 加油包
    const remainingCredits = Math.max(0, maxCredits - usedCredits);

    // 3. 构造友好的时间与数据展示
    const formattedTasks = recentTasks.map(task => {
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
        title: task.rawResponseText ? task.rawResponseText.slice(0, 20) + "..." : "AI 视觉分析任务", 
        type: "video", 
        time: timeStr,
        platform: task.targetPlatform || "通用",
      };
    });

    // 💡 只有这一个干净利落的 return
    return NextResponse.json({
      quota: {
        used: usedCredits, // 🚀 真实显示用掉的积分
        total: maxCredits,
        remaining: remainingCredits
      },
      recentActivities: formattedTasks,
    });

  } catch (error) {
    console.error("[DASHBOARD_GET_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}