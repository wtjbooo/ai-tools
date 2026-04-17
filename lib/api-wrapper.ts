// lib/api-wrapper.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAndDeductQuota, refundQuota } from "@/lib/quota";
// 👈 引入我们刚刚新建的中央物价局
import { getModelCost } from "@/lib/pricing";

interface ProtectionOptions {
  rateLimiter?: any;       
  cost?: number;      // 静态定价（适合完全不扣费的接口，比如 cost: 0）
  taskType?: 'text' | 'vision' | 'image_gen' | 'video_gen'; // 👈 新增：动态定价（告诉包装器这是什么任务，它会自动去查价！）
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
      // --- 1. 登录与身份校验 ---
      const token = req.cookies.get("session_token")?.value;
      if (!token) return NextResponse.json({ error: "您还没有登录，请先登录。" }, { status: 401 });

      const session = await prisma.session.findUnique({
        where: { sessionToken: token },
        select: { userId: true, expires: true }
      });

      if (!session || session.expires < new Date()) return NextResponse.json({ error: "登录已失效，请重新登录。" }, { status: 401 });
      
      const userId = session.userId;

      // --- 2. 接口限流保护 ---
      if (options.rateLimiter) {
        const { success, limit } = await options.rateLimiter.limit(userId);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ error: "您的请求过于频繁，保护机制已触发，请稍后再试。" }), 
            { status: 429, headers: { "Content-Type": "application/json", "X-RateLimit-Limit": limit.toString() } }
          );
        }
      }

      // --- 3. 🧠 核心升级：智能动态算价 ---
      let finalCost = options.cost ?? 0; // 默认使用静态配置的价格

      // 如果配置了 taskType（说明开启了动态计费），且是 POST 请求
      if (options.taskType && req.method === "POST") {
        try {
          // 💡 神奇魔法：克隆一份请求体，偷偷看一眼模型名字，不影响后续业务！
          const clonedReq = req.clone();
          const body = await clonedReq.json();
          
          // 兼容你不同接口里对模型的命名习惯
          const modelName = body.targetModel || body.analyzerModel || body.model || "";
          
          // 找物价局查真实价格！
          finalCost = getModelCost(modelName, options.taskType);
          console.log(`[计费网关] 任务: ${options.taskType}, 模型: ${modelName}, 本次需扣除: ${finalCost} 积分`);

        } catch (e) {
          console.error("[计费网关] 提取模型名称失败，触发安全兜底计费", e);
          finalCost = 3; // 如果解析失败，为了防止被白嫖，兜底扣除 3 分
        }
      }

      // --- 4. 积分校验与扣除 ---
      let remainingQuota: number | undefined = undefined;
      if (finalCost > 0) {
        const quotaResult = await checkAndDeductQuota(userId, finalCost);
        if (!quotaResult.allowed) return NextResponse.json({ error: quotaResult.error }, { status: 403 }); 
        remainingQuota = quotaResult.remaining !== undefined ? Number(quotaResult.remaining) : undefined;
      }

      // --- 5. 执行核心业务与失败回滚 ---
      try {
        return await handler(req, { userId, remainingQuota });
      } catch (handlerError: any) {
        console.error(`[回滚拦截] 业务失败，准备退款。用户 ID: ${userId}, 退还积分: ${finalCost}`, handlerError.message);
        
        // 🚨 精准退款：业务报错了，把刚刚算好的动态积分退给用户
        if (finalCost > 0) {
          await refundQuota(userId, finalCost);
        }
        throw handlerError; 
      }

    } catch (error: any) {
      console.error("API 包装器捕获到异常:", error.message);
      const errorMsg = error.message || "服务器异常，请稍后再试。";
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  };
}