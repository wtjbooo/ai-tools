// app/api/admin/fulfill/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { outTradeNo, adminPassword } = await req.json();

    // 🔒 极简安全校验：只有你自己知道这个密码才能发货
    if (adminPassword !== "你的站长专属密码123") {
      return NextResponse.json({ error: "权限不足，请联系开发者" }, { status: 403 });
    }

    // 1. 查找订单
    const order = await prisma.order.findUnique({
      where: { outTradeNo },
      include: { user: true }
    });

    if (!order) return NextResponse.json({ error: "订单号不存在" }, { status: 404 });
    if (order.status === "paid") return NextResponse.json({ error: "该订单已发货，请勿重复操作" }, { status: 400 });

    const userId = order.userId;

    // 2. ⚡ 核心发货逻辑
    let updateData: any = {};
    
    // 如果是包月 Pro
    if (order.planType === "monthly_pro") {
      updateData = { isPro: true };
    } 
    // 如果是 50 次加油包
    else if (order.planType === "quota_50") {
      updateData = { 
        bonusCredits: { increment: 50 } // 自动在原有积分上加 50
      };
    }

    // 3. 开启数据库事务：确保订单更新和用户充值同时成功
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: updateData
      }),
      prisma.order.update({
        where: { outTradeNo },
        data: { 
          status: "paid", 
          paidAt: new Date() 
        }
      })
    ]);

    console.log(`[发货成功] 订单: ${outTradeNo}, 套餐: ${order.planType}, 用户 ID: ${userId}`);

    return NextResponse.json({ success: true, message: "发货成功！积分/权益已秒到账。" });

  } catch (error: any) {
    console.error("[发货系统崩溃]", error);
    return NextResponse.json({ error: "发货系统异常" }, { status: 500 });
  }
}