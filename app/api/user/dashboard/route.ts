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

    // 2. 🚀 完美修复：计算本月第一天，作为流水查询起点
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 3. 🎯 商业级聚合查询 (Aggregate)：直接累加本月内且成功的流水 cost
    const usageResult = await prisma.aIGenerationRecord.aggregate({
      _sum: { cost: true },
      where: {
        userId: user.id,
        status: "success", // 只统计扣费成功的任务
        createdAt: { gte: startOfMonth }, // 大于等于本月第一天
      },
    });

    // 从流水表中提取真实的本月已消耗总积分（如果没有记录，则默认为 0）
    const monthlyUsed = usageResult._sum.cost || 0;

    // 4. 重构清爽干净的额度算法
    const MONTHLY_FREE_POINTS = 100; 
    const MONTHLY_PRO_POINTS = 2000; 
    
    // 基础额度
    const baseCredits = user.isPro ? MONTHLY_PRO_POINTS : MONTHLY_FREE_POINTS;
    // 额外购买或奖励的额度
    const bonusCredits = user.bonusCredits || 0; 

    // 极简且绝对正确的计算公式
    const displayTotal = baseCredits + bonusCredits; // 总额度永远等于 基础 + 额外
    const displayUsed = monthlyUsed; // 已用额度永远等于流水表累加
    const remainingCredits = Math.max(0, displayTotal - displayUsed); // 剩余 = 总计 - 已用

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