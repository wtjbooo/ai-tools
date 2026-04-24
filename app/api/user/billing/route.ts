// app/api/user/billing/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionToken = cookies().get("session_token")?.value;
    if (!sessionToken) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    }

    const user = session.user;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. 获取本月已用额度
    const usageResult = await prisma.aIGenerationRecord.aggregate({
      _sum: { cost: true },
      where: {
        userId: user.id,
        status: "success",
        createdAt: { gte: startOfMonth },
      },
    });

    const monthlyUsed = usageResult._sum.cost || 0;
    const baseCredits = user.isPro ? 2000 : 100;
    const totalCredits = baseCredits; 
    const remaining = Math.max(0, totalCredits - monthlyUsed);

    // 2. 获取最近 50 条扣费流水账 (仅展示产生花费的成功任务)
    const records = await prisma.aIGenerationRecord.findMany({
      where: { 
        userId: user.id, 
        status: "success",
        cost: { gt: 0 } // cost 大于 0
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        toolType: true,
        title: true,
        cost: true,
        createdAt: true,
      }
    });

    // 格式化流水数据供前端展示
    const formattedHistory = records.map(record => ({
      id: record.id,
      title: record.title || "AI 灵感生成",
      type: record.toolType,
      cost: record.cost,
      date: record.createdAt.toISOString().split('T')[0], // YYYY-MM-DD
      time: record.createdAt.toISOString().split('T')[1].substring(0, 5) // HH:mm
    }));

    return NextResponse.json({
      success: true,
      planName: user.isPro ? "Pro 创作者" : "免费计划",
      isPro: user.isPro,
      quota: { used: monthlyUsed, total: totalCredits, remaining },
      history: formattedHistory
    });

  } catch (error) {
    console.error("[BILLING_GET_ERROR]", error);
    return NextResponse.json({ error: "获取账单数据失败" }, { status: 500 });
  }
}