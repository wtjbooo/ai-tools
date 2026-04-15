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
 * 🛡️ 终极 API 安全包装器 (包含异常回滚补偿机制)
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

      // 2. 【限流】Redis 频率拦截
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

      // 3. 【商业化】扣除额度 (锁定额度)
      let remainingQuota: number | undefined = undefined;
      if (options.deductQuota) {
        const quotaResult = await checkAndDeductQuota(userId);
        if (!quotaResult.allowed) {
          return NextResponse.json({ error: quotaResult.error }, { status: 403 }); 
        }
        remainingQuota = quotaResult.remaining !== undefined ? Number(quotaResult.remaining) : undefined;
      }

      // 4. ✅ 【执行与回滚】将数据交给真正的业务逻辑处理
      try {
        return await handler(req, { userId, remainingQuota });
      } catch (handlerError: any) {
        // ❌ 如果核心大模型逻辑报错（如超时、网络异常、宕机等）
        console.error(`[回滚拦截] 业务逻辑执行失败，准备触发额度回滚补偿。用户 ID: ${userId}`, handlerError);
        
        // 如果这个接口开启了扣费，我们要把刚刚吃进去的额度“吐”出来
        if (options.deductQuota) {
          await prisma.user.update({
            where: { id: userId },
            data: { freeUsesToday: { decrement: 1 } } // 刚才 +1 了，现在 -1 退回去
          });
          console.log(`[回滚成功] 已成功为用户 ${userId} 退还 1 次免费额度！`);
        }
        
        // 额度退还后，继续把错误抛给外层
        throw handlerError; 
      }

    } catch (error: any) {
      console.error("API 包装器捕获到异常:", error);
      // 💡 核心修复：透传原始报错信息给前端，否则会被统一覆盖成“内部错误”！
      const errorMsg = error.message || "服务器内部处理错误，请稍后再试。";
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  };
}