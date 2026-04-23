// app/api/user/dashboard/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma"; 

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

    // 1. 获取近期轨迹
    const recentTasks = await prisma.reversePromptTask.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        targetPlatform: true,
        status: true,
        createdAt: true,
        rawResponseText: true, 
      },
    });

    // 2. 完美修复：彻底抹平失败退款导致的“大盘总额度虚高”问题
    const DAILY_FREE_POINTS = 100; 
    const DAILY_PRO_POINTS = 2000; // 🚨 修复：和 quota.ts 保持绝对一致
    
    const now = new Date();
    const lastUsed = user.lastUsedDate;
    let dbUsedCredits = user.freeUsesToday;
    const dbBonusCredits = user.bonusCredits || 0; 

    // 跨天判断
    const isToday =
      lastUsed &&
      lastUsed.getDate() === now.getDate() &&
      lastUsed.getMonth() === now.getMonth() &&
      lastUsed.getFullYear() === now.getFullYear();

    if (!isToday) {
      dbUsedCredits = 0; 
    }

    const baseCredits = user.isPro ? DAILY_PRO_POINTS : DAILY_FREE_POINTS;

    // 🎯 核心净值算法：将“失败退款”与“已用次数”在展示时互相抵消！
    // 这样用户在界面上永远看不到那些因为接口报错而产生的幽灵扣费。
    const displayUsed = Math.max(0, dbUsedCredits - dbBonusCredits);
    const displayTotal = baseCredits + Math.max(0, dbBonusCredits - dbUsedCredits);
    const remainingCredits = Math.max(0, baseCredits + dbBonusCredits - dbUsedCredits);

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

    return NextResponse.json({
      quota: {
        used: displayUsed, 
        total: displayTotal,
        remaining: remainingCredits
      },
      recentActivities: formattedTasks,
    });

  } catch (error) {
    console.error("[DASHBOARD_GET_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}