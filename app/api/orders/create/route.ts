// app/api/orders/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withProtection } from "@/lib/api-wrapper";

// 生成带有时间戳和随机字符串的唯一定单号
function generateTradeNo() {
  const date = new Date();
  const timestamp = date.getFullYear().toString() + 
    (date.getMonth() + 1).toString().padStart(2, '0') + 
    date.getDate().toString().padStart(2, '0') + 
    date.getHours().toString().padStart(2, '0') + 
    date.getMinutes().toString().padStart(2, '0') + 
    date.getSeconds().toString().padStart(2, '0');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD_${timestamp}_${randomStr}`;
}

export const POST = withProtection(
  async (req: NextRequest, { userId }) => {
    try {
      const { planType, amount, paymentMethod = "wechat" } = await req.json();

      if (!planType || !amount) {
        return NextResponse.json({ error: "套餐信息不完整" }, { status: 400 });
      }

      // 1. 生成唯一订单号
      const outTradeNo = generateTradeNo();

      // 2. 在数据库中创建待支付订单
      const newOrder = await prisma.order.create({
        data: {
          userId,
          outTradeNo,
          amount: Number(amount), // 金额（分）
          planType,
          status: "pending",      // 初始状态为待支付
          paymentMethod,
        },
      });

      console.log(`[订单系统] 新订单已生成: ${outTradeNo}, 用户: ${userId}, 金额: ${amount}分`);

      return NextResponse.json({ 
        success: true, 
        orderId: newOrder.outTradeNo 
      });

    } catch (error: any) {
      console.error("[订单创建失败]", error);
      return NextResponse.json({ error: "订单创建失败，请稍后重试" }, { status: 500 });
    }
  },
  {
    cost: 0, // 👈 核心：创建订单绝对不能扣除用户的积分，所以设为 0！
  }
);