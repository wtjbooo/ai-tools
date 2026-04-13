import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; 
// 🔥 1. 引入我们刚才写的限流器
import { uploadRateLimit } from "@/lib/ratelimit";

const s3Client = new S3Client({
  // ... (保持你原来的 S3Client 配置不变)
});

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "您还没有登录，无法上传文件哦。" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      select: { 
        userId: true,
        expires: true 
      }
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已失效，请重新登录。" }, { status: 401 });
    }

    // ==========================================
    // 🛡️ 核心新增：基于用户 ID 执行 Redis 级限流
    // ==========================================
    // 使用 userId 作为识别唯一用户的标识
    const identifier = session.userId;
    const { success, pending, limit, reset, remaining } = await uploadRateLimit.limit(identifier);
    
    // 如果 success 为 false，说明超出了我们在 lib/ratelimit.ts 里设置的频率限制
    if (!success) {
       return new NextResponse(
         JSON.stringify({ 
           error: "上传请求过于频繁，请稍作休息（建议1分钟后再试）。",
           // 还可以优雅地告诉前端什么时候解封
           resetTime: reset 
         }), 
         { 
           status: 429, // 429 Too Many Requests 是标准的限流状态码
           headers: {
             "Content-Type": "application/json",
             "X-RateLimit-Limit": limit.toString(),
             "X-RateLimit-Remaining": remaining.toString(),
           } 
         }
       );
    }
    // ==========================================

    const { filename, contentType } = await request.json();
    
    // ... (后续的获取 S3 URL 逻辑保持不变)

  } catch (error) {
    // ... (错误处理保持不变)
  }
}