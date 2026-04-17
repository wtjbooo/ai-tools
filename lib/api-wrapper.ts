// lib/api-wrapper.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
// 注意：你接下来需要在 lib/quota.ts 里修改这个函数，让它接收 cost 参数
import { checkAndDeductQuota } from "@/lib/quota";

interface ProtectionOptions {
  rateLimiter?: any;       
  cost?: number;   // 👈 核心升级：引入动态定价（积分为单位）
}

type BusinessLogicHandler = (
  req: NextRequest, 
  context: { userId: string; remainingQuota?: number }
) => Promise<NextResponse>;

export function withProtection(
  handler: BusinessLogicHandler, 
  options: ProtectionOptions = {}
) {
  return async (req: NextRequest) => {
    try {
      const token = req.cookies.get("session_token")?.value;
      if (!token) return NextResponse.json({ error: "您还没有登录，请先登录。" }, { status: 401 });

      const session = await prisma.session.findUnique({
        where: { sessionToken: token },
        select: { userId: true, expires: true }
      });

      if (!session || session.expires < new Date()) return NextResponse.json({ error: "登录已失效，请重新登录。" }, { status: 401 });
      
      const userId = session.userId;

      // 1. 接口限流保护
      if (options.rateLimiter) {
        const { success, limit } = await options.rateLimiter.limit(userId);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ error: "您的请求过于频繁，保护机制已触发，请稍后再试。" }), 
            { status: 429, headers: { "Content-Type": "application/json", "X-RateLimit-Limit": limit.toString() } }
          );
        }
      }

      // 2. 动态积分扣除
      let remainingQuota: number | undefined = undefined;
      if (options.cost && options.cost > 0) {
        // 将花费的分数传给扣费函数
        const quotaResult = await checkAndDeductQuota(userId, options.cost);
        if (!quotaResult.allowed) return NextResponse.json({ error: quotaResult.error }, { status: 403 }); 
        remainingQuota = quotaResult.remaining !== undefined ? Number(quotaResult.remaining) : undefined;
      }

      // 3. 执行核心业务与失败回滚
      try {
        return await handler(req, { userId, remainingQuota });
      } catch (handlerError: any) {
        console.error(`[回滚拦截] 业务逻辑执行失败，准备触发积分回滚。用户 ID: ${userId}, 退还积分: ${options.cost}`, handlerError.message);
        
        // 🚨 动态退款：把扣除的真实积分精准加回去
        if (options.cost && options.cost > 0) {
          await prisma.user.update({
            where: { id: userId },
            // 假设你的 User 表里积分字段叫 credits。如果是别的名字请替换
            data: { credits: { increment: options.cost } } 
          });
        }
        throw handlerError; 
      }

    } catch (error: any) {
      console.error("API 包装器捕获到异常:", error.message);
      // 把大模型抛出的真实报错原封不动传给前端
      const errorMsg = error.message || "服务器异常，请稍后再试。";
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  };
}