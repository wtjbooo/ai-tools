import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withProtection } from "@/lib/api-wrapper";
import { createOrderRateLimit } from "@/lib/ratelimit";

// 💰 价格表配置 (单位严格使用“分”，例如 990 = 9.9元)
const PLAN_PRICES: Record<string, number> = {
  "quota_50": 990,      // 加油包 9.9 元
  "monthly_pro": 3900,  // 包月会员 39.0 元
};

export const POST = withProtection(
  async (req: NextRequest, { userId }) => {
    try {
      // 默认使用微信支付(wechat)，也可以传 alipay
      const { planType, paymentMethod = "wechat" } = await req.json();

      // 1. 校验套餐是否存在
      const amount = PLAN_PRICES[planType];
      if (!amount) {
        return NextResponse.json({ error: "无效的套餐类型" }, { status: 400 });
      }

      // 2. 生成全局唯一的商户订单号 (前缀 + 时间戳 + 4位随机数)
      const outTradeNo = `PAY_${Date.now()}_${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // 3. 💾 在 Prisma 数据库中创建待支付 (pending) 订单
      const order = await prisma.order.create({
        data: {
          userId,
          outTradeNo,
          amount,
          planType,
          paymentMethod,
          status: "pending",
        }
      });

      // 4. 🔗 生成模拟收款二维码（通过公共 API 把订单号转成二维码图片）
      // 以后接了真实微信/支付宝，只需把这里替换成真实请求拿到的 URL 即可
      const mockQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MOCK_PAY_${outTradeNo}`;

      // 5. 返回给前端
      return NextResponse.json({
        success: true,
        orderId: order.id,
        outTradeNo: order.outTradeNo,
        qrCodeUrl: mockQrCodeUrl,
        displayAmount: amount / 100 // 把"分"转回"元"给前端显示
      });

    } catch (error: any) {
      console.error("创建订单失败:", error);
      return NextResponse.json({ error: "订单创建失败，请稍后重试" }, { status: 500 });
    }
  },
  // ⚙️ 万能包装器配置：
  {
    rateLimiter: createOrderRateLimit, // 开启防刷单限流
    deductQuota: false                 // ⚠️ 创建订单绝对不能扣除用户的 AI 算力额度！
  }
);