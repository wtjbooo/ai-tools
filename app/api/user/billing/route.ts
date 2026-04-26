// app/api/user/billing/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionToken = cookies().get("session_token")?.value;
    const lxSession = cookies().get("lx_session")?.value;
    const token = sessionToken || lxSession;

    if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const session = await prisma.session.findFirst({
      where: { sessionToken: token },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "会话无效或已过期" }, { status: 401 });
    }

    const user = session.user;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. 获取近期账单流水 (最近 50 条，包含签到记录)
    const historyRecords = await prisma.aIGenerationRecord.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // 2. 🚀 财务分拣：只统计真实的消费扣费 (cost > 0)
    const usageAgg = await prisma.aIGenerationRecord.aggregate({
      _sum: { cost: true },
      where: { userId: user.id, status: "success", cost: { gt: 0 }, createdAt: { gte: startOfMonth } },
    });
    const monthlyUsed = usageAgg._sum.cost || 0;

    // 3. 🚀 财务分拣：只统计福利赚取的积分 (cost < 0)
    const bonusAgg = await prisma.aIGenerationRecord.aggregate({
      _sum: { cost: true },
      where: { userId: user.id, status: "success", cost: { lt: 0 }, createdAt: { gte: startOfMonth } },
    });
    const monthlyEarned = Math.abs(bonusAgg._sum.cost || 0);

    // 4. 计算当前额度 
    const MONTHLY_FREE_POINTS = 100;
    const MONTHLY_PRO_POINTS = 3000;
    const baseCredits = user.isPro ? MONTHLY_PRO_POINTS : MONTHLY_FREE_POINTS;

    // 总计 = 基础额度 + 本月赚取的额外福利
    const displayTotal = baseCredits + monthlyEarned;
    const displayUsed = monthlyUsed;
    const remainingCredits = Math.max(0, displayTotal - displayUsed);

    // 5. 格式化流水，给前端渲染
    const formattedHistory = historyRecords.map(record => {
      const dateObj = new Date(record.createdAt);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');

      return {
        id: record.id,
        title: record.title || "AI 灵感任务",
        type: record.toolType || "unknown",
        cost: record.cost, 
        date: `${yyyy}-${mm}-${dd}`,
        time: `${hh}:${min}`,
      };
    });

    return NextResponse.json({
      success: true,
      planName: user.isPro ? "Pro 创作者" : "基础体验版",
      isPro: user.isPro,
      quota: {
        used: displayUsed,
        total: displayTotal,
        remaining: remainingCredits
      },
      history: formattedHistory
    });
  } catch (error) {
    console.error("Billing API Error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}