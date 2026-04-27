import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { outTradeNo, adminPassword } = await req.json();

    // 🔒 极简安全校验：只有你自己知道这个密码才能发货
    if (adminPassword !== "XAiraYbq0708..") {
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

    // 2. ⚡ 全新积分系统发货逻辑计算
    let addedCredits = 0;
    let isProUpdate = order.user.isPro; // 默认保持原有身份
    let recordName = "系统充值";

    if (order.planType === "monthly_pro") {
      isProUpdate = true;
      addedCredits = 3000; // PRO 会员直接到账 3000 基础算力
      recordName = "开通 PRO 连续包月";
    } 
    else if (order.planType === "credit_1000") {
      addedCredits = 1000; // 加油包充值 1000 算力
      recordName = "购买 1000 算力加油包";
    } 
    else {
      // 防御性设计：如果是未知的旧套餐，默认给 100 积分
      addedCredits = 100;
      recordName = "后台手动补偿积分";
    }

    // 3. 🚀 开启安全的数据库事务：资产、订单、流水三张表必须同时成功
    await prisma.$transaction(async (tx) => {
      
      // A. 更新用户资产
      await tx.user.update({
        where: { id: userId },
        data: { 
          isPro: isProUpdate,
          bonusCredits: { increment: addedCredits }
        }
      });

      // B. 更新订单状态为已支付
      await tx.order.update({
        where: { outTradeNo },
        data: { 
          status: "paid", 
          paidAt: new Date() 
        }
      });

      // C. 记账！写入流水，让前端仪表盘能读到这笔收入
      await tx.aIGenerationRecord.create({
        data: {
          userId: userId,
          cost: -addedCredits,     // 负数代表收入/充值福利
          toolType: "RECHARGE",    // 💡 修复：补上必填的 toolType
          title: recordName        // 💡 修复：补上必填的 title，直接使用上方定义好的名称
        }
      });

    });

    console.log(`[发货成功] 订单: ${outTradeNo}, 充值: ${addedCredits}积分, 用户ID: ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: `发货成功！已为用户充值 ${addedCredits} 积分。` 
    });

  } catch (error: any) {
    console.error("[发货系统崩溃]", error);
    return NextResponse.json({ error: "发货系统异常" }, { status: 500 });
  }
}