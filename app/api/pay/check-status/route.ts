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
      // 在真实接支付宝/微信时，加额度是在“支付回调(Webhook)”的绝对安全环境中做的。
      if (order.status === "paid") {
         if (order.planType === "quota_50") {
             // 💡 修复隐藏炸弹：
             // 因为 freeUsesToday 记录的是“今日已用积分”
             // 所以“增加50可用额度”的实质是“减少50已用额度” (decrement)
             // 这样用户在计算 (100 - 已用) 的时候，就会多出 50 分！
             await prisma.user.update({
                 where: { id: userId },
                 data: { freeUsesToday: { decrement: 50 } }
             });
         }
         // 这里可以继续写包月的逻辑...
      }

      return NextResponse.json({ 
        success: true, 
        status: order.status // "pending" | "paid" | "failed"
      });

    } catch (error: any) {
      console.error("查询订单状态失败:", error);
      return NextResponse.json({ error: "查询订单状态失败" }, { status: 500 });
    }
  },
  // ⚙️ 万能包装器的配置项：
  { 
    cost: 0 // 👈 完美修复：查状态不花积分，所以 cost 设为 0 即可安全放行！
  } 
);