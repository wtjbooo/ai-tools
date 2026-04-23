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

    // 1. 获取近期轨迹（🚀 核心优化：改成查询全新的 AIGenerationRecord 万能流水表）
    const recentTasks = await prisma.aIGenerationRecord.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5, 
      select: {
        id: true,
        toolType: true,
        title: true,
        status: true,
        createdAt: true,
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

    // 3. 构造友好的时间与数据展示
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

      // 🚀 核心优化：根据不同的工具类型，给前端返回对应的图标和中文名
      let platformName = "官方原生工具";
      let frontendType = "sparkles"; // 默认星光图标

      if (task.toolType === "reverse") {
         platformName = "图像反推";
         frontendType = "image";
      } else if (task.toolType === "enhance") {
         platformName = "魔法扩写";
         frontendType = "video";
      } else if (task.toolType === "search") {
         platformName = "全网搜索";
         frontendType = "sparkles";
      }

      return {
        id: task.id,
        title: task.title || "AI 灵感任务", 
        type: frontendType, 
        time: timeStr,
        platform: platformName,
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