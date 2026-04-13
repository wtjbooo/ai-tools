// lib/api-wrapper.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAndDeductQuota } from "@/lib/quota";

// 定义传给包装器的配置选项
interface ProtectionOptions {
  rateLimiter?: any;       // 传入不同的 Redis 限流器
  deductQuota?: boolean;   // 是否需要扣除今日额度？(默认 false)
}

// 定义核心业务逻辑的函数格式
type BusinessLogicHandler = (
  req: NextRequest, 
  context: { userId: string; remainingQuota?: number }
) => Promise<NextResponse>;

/**
 * 🛡️ 终极 API 安全包装器
 */
export function withProtection(
  handler: BusinessLogicHandler, 
  options: ProtectionOptions = {}
) {
  return async (req: NextRequest) => {
    try {
      // 1. 【鉴权】提取登录凭证
      const token = req.cookies.get("session_token")?.value;
      if (!token) {
        return NextResponse.json({ error: "您还没有登录，请先登录。" }, { status: 401 });
      }

      const session = await prisma.session.findUnique({
        where: { sessionToken: token },
        select: { userId: true, expires: true }
      });

      if (!session || session.expires < new Date()) {
        return NextResponse.json({ error: "登录已失效，请重新登录。" }, { status: 401 });
      }
      
      const userId = session.userId;

      // 2. 【限流】Redis 频率拦截 (如果配置了的话)
      if (options.rateLimiter) {
        const { success, limit, remaining } = await options.rateLimiter.limit(userId);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ error: "您的请求过于频繁，保护机制已触发，请稍后再试。" }), 
            { 
              status: 429,
              headers: { "Content-Type": "application/json", "X-RateLimit-Limit": limit.toString() } 
            }
          );
        }
      }

      // 3. 【商业化】扣除额度 (如果配置了的话)
      let remainingQuota: number | undefined = undefined;
      if (options.deductQuota) {
        const quotaResult = await checkAndDeductQuota(userId);
        if (!quotaResult.allowed) {
          return NextResponse.json({ error: quotaResult.error }, { status: 403 }); 
        }
        // ✅ 修复：加入类型转换，确保 Vercel 的 TS 编译器顺利通过
        remainingQuota = quotaResult.remaining !== undefined ? Number(quotaResult.remaining) : undefined;
      }

      // 4. ✅ 所有安检全部通过！将纯净的数据交给真正的业务逻辑处理
      return await handler(req, { userId, remainingQuota });

    } catch (error: any) {
      console.error("API 包装器捕获到未处理的异常:", error);
      return NextResponse.json({ error: "服务器内部处理错误，请稍后再试。" }, { status: 500 });
    }
  };
}