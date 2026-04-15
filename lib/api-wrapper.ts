import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAndDeductQuota } from "@/lib/quota";

interface ProtectionOptions {
  rateLimiter?: any;       
  deductQuota?: boolean;   
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

      if (options.rateLimiter) {
        const { success, limit } = await options.rateLimiter.limit(userId);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ error: "您的请求过于频繁，保护机制已触发，请稍后再试。" }), 
            { status: 429, headers: { "Content-Type": "application/json", "X-RateLimit-Limit": limit.toString() } }
          );
        }
      }

      let remainingQuota: number | undefined = undefined;
      if (options.deductQuota) {
        const quotaResult = await checkAndDeductQuota(userId);
        if (!quotaResult.allowed) return NextResponse.json({ error: quotaResult.error }, { status: 403 }); 
        remainingQuota = quotaResult.remaining !== undefined ? Number(quotaResult.remaining) : undefined;
      }

      try {
        return await handler(req, { userId, remainingQuota });
      } catch (handlerError: any) {
        console.error(`[回滚拦截] 业务逻辑执行失败，准备触发额度回滚。用户 ID: ${userId}`, handlerError.message);
        if (options.deductQuota) {
          await prisma.user.update({
            where: { id: userId },
            data: { freeUsesToday: { decrement: 1 } } 
          });
        }
        throw handlerError; 
      }

    } catch (error: any) {
      console.error("API 包装器捕获到异常:", error.message);
      // 🚨 核心修复：把大模型抛出的真实报错（带着退款提示的中文）原封不动传给前端！
      const errorMsg = error.message || "服务器异常，请稍后再试。";
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  };
}