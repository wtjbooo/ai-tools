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
    const now = new Date();

    // 1. 获取近期轨迹
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

    // 2. 计算本月第一天，作为流水查询起点
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 3. 🚀 商业级财务分拣：分别统计【真实消费】和【福利收入】
    
    // 消费流水：(cost > 0)
    const usageAgg = await prisma.aIGenerationRecord.aggregate({
      _sum: { cost: true },
      where: {
        userId: user.id,
        status: "success", 
        cost: { gt: 0 }, // 只有正数才是真正的扣费
        createdAt: { gte: startOfMonth }, 
      },
    });
    const monthlyUsed = usageAgg._sum.cost || 0;

    // 收入流水：(cost < 0，如签到送的 100)
    const bonusAgg = await prisma.aIGenerationRecord.aggregate({
      _sum: { cost: true },
      where: {
        userId: user.id,
        status: "success", 
        cost: { lt: 0 }, // 负数代表赚到的奖励
        createdAt: { gte: startOfMonth }, 
      },
    });
    // 把负数的收入取绝对值，变成正数用来加到总额度里
    const monthlyEarned = Math.abs(bonusAgg._sum.cost || 0); 

    // 4. 重构清爽干净的额度算法
    const MONTHLY_FREE_POINTS = 100; 
    const MONTHLY_PRO_POINTS = 3000; // 建议提至3000，显得39元更划算
    
    // 基础订阅额度
    const baseCredits = user.isPro ? MONTHLY_PRO_POINTS : MONTHLY_FREE_POINTS;
    
    // 极简且绝对正确的计算公式
    const displayTotal = baseCredits + monthlyEarned; // 总计 = 基础包 + 本月签到赚的
    const displayUsed = monthlyUsed; // 已用 = 真实花掉的
    const remainingCredits = Math.max(0, displayTotal - displayUsed); 

    // 5. 构造友好的时间与数据展示
    const formattedTasks = recentTasks.map(task => {
      const taskDate = new Date(task.createdAt);
      const diffMs = now.getTime() - taskDate.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60)); 
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60)); 
      
      let timeStr = "";
      if (diffMins < 1) timeStr = "刚刚";
      else if (diffMins < 60) timeStr = `${diffMins} 分钟前`;
      else if (diffHrs < 24) timeStr = `${diffHrs} 小时前`;
      else if (diffHrs < 48) timeStr = "昨天";
      else timeStr = `${Math.floor(diffHrs / 24)} 天前`;

      let platformName = "官方原生工具";
      let frontendType = "sparkles"; 

      if (task.toolType === "reverse") {
         platformName = "图像反推";
         frontendType = "image";
      } else if (task.toolType === "enhance") {
         platformName = "魔法扩写";
         frontendType = "video";
      } else if (task.toolType === "search") {
         platformName = "全网搜索";
         frontendType = "sparkles";
      } else if (task.toolType === "checkin") {
         platformName = "官方福利";
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