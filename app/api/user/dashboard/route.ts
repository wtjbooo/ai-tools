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

    // 1. 获取近期轨迹（优化：将 3 条提升为 5 条，让前端页面更丰满）
    const recentTasks = await prisma.reversePromptTask.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5, 
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
    const DAILY_PRO_POINTS = 2000; 
    
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
    const displayUsed = Math.max(0, dbUsedCredits - dbBonusCredits);
    const displayTotal = baseCredits + Math.max(0, dbBonusCredits - dbUsedCredits);
    const remainingCredits = Math.max(0, baseCredits + dbBonusCredits - dbUsedCredits);

    // 3. 构造友好的时间与数据展示（优化：增加了分钟级别的精准计算）
    const formattedTasks = recentTasks.map(task => {
      const taskDate = new Date(task.createdAt);
      const diffMs = now.getTime() - taskDate.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60)); // 计算相差多少分钟
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60)); // 计算相差多少小时
      
      let timeStr = "";
      if (diffMins < 1) timeStr = "刚刚";
      else if (diffMins < 60) timeStr = `${diffMins} 分钟前`;
      else if (diffHrs < 24) timeStr = `${diffHrs} 小时前`;
      else if (diffHrs < 48) timeStr = "昨天";
      else timeStr = `${Math.floor(diffHrs / 24)} 天前`;

      // 提取标题，做安全校验
      let title = "AI 视觉分析任务";
      if (task.rawResponseText && typeof task.rawResponseText === 'string') {
         // 去除可能包含的 Markdown 符号或换行符，让标题更干净
         const cleanText = task.rawResponseText.replace(/[\r\n#*]/g, '').trim();
         title = cleanText.length > 20 ? cleanText.slice(0, 20) + "..." : cleanText;
      }

      return {
        id: task.id,
        title: title || "AI 视觉分析任务", 
        type: "video", // 根据你的业务，如果有图片任务可以根据数据库字段动态判断
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