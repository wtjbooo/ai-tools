import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withProtection } from "@/lib/api-wrapper";

export const POST = withProtection(
  async (req: NextRequest, { userId }) => {
    try {
      const { outTradeNo } = await req.json();

      if (!outTradeNo) {
        return NextResponse.json({ error: "缺少订单号" }, { status: 400 });
      }

      // 去数据库里查这笔订单的状态
      const order = await prisma.order.findUnique({
        where: { outTradeNo },
        select: { status: true, planType: true }
      });

      if (!order) {
        return NextResponse.json({ error: "订单不存在" }, { status: 404 });
      }

      // 如果订单状态是 "paid" (已支付)，系统顺便把用户的额度加回去
      // ⚠️ 注意：这里为了简便，我们把加额度的逻辑放在了查询里。
      // 在真实接支付宝时，加额度是在“支付回调(Webhook)”里做的。
      if (order.status === "paid") {
         if (order.planType === "quota_50") {
             // 买了加油包，给用户的免费次数加 50
             await prisma.user.update({
                 where: { id: userId },
                 data: { freeUsesToday: { increment: 50 } }
             });
         }
         // 这里可以继续写包月的逻辑...
      }

      return NextResponse.json({ 
        success: true, 
        status: order.status // "pending" | "paid" | "failed"
      });

    } catch (error: any) {
      return NextResponse.json({ error: "查询订单状态失败" }, { status: 500 });
    }
  },
  { deductQuota: false } // 查状态绝对不能扣除算力！
);