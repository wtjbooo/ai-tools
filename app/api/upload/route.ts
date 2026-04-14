// app/api/upload/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; 
// 🔥 1. 引入刚才写的限流器
import { uploadRateLimit } from "@/lib/ratelimit";

// 🚀 2. 初始化连通 Cloudflare R2 的客户端
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  // 👇 这个救命配置千万不能丢
  forcePathStyle: true, 
});

export async function POST(request: NextRequest) {
  try {
    // 🛡️ 3. 提取 Token（务必用正确的 NextAuth 名称！）
    // 🛡️ 终极无敌 Cookie 提取法（本地、安全前缀、主机前缀全通吃）
    const token = request.cookies.get("next-auth.session-token")?.value 
               || request.cookies.get("__Secure-next-auth.session-token")?.value
               || request.cookies.get("__Host-next-auth.session-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "您还没有登录，无法上传文件哦。" }, { status: 401 });
    }

    // 🛡️ 4. 查库核实身份
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
    // 🛡️ 5. 核心新增：基于用户 ID 执行 Redis 级限流
    // ==========================================
    const identifier = session.userId;
    const { success, pending, limit, reset, remaining } = await uploadRateLimit.limit(identifier);
    
    // 如果 success 为 false，说明超频了
    if (!success) {
       return NextResponse.json(
         { 
           error: "上传请求过于频繁，请稍作休息（建议1分钟后再试）。",
           resetTime: reset 
         }, 
         { 
           status: 429,
           headers: {
             "X-RateLimit-Limit": limit.toString(),
             "X-RateLimit-Remaining": remaining.toString(),
           } 
         }
       );
    }
    // ==========================================

    // 🚀 6. 接收文件并生成上传链接
    const body = await request.json();
    const filename = body.filename;
    const contentType = body.contentType;

    if (!filename || !contentType) {
      return NextResponse.json({ error: "缺少文件信息" }, { status: 400 });
    }

    const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFilename,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ uploadUrl: signedUrl, fileKey: uniqueFilename }, { status: 200 });

  } catch (error: any) {
    console.error("上传接口发生严重错误:", error);
    // 🛡️ 7. 究极防弹兜底：专门对付 Neon 数据库休眠！
    return NextResponse.json(
      { error: "连接数据库或云存储失败（数据库可能在休眠），请刷新页面重试！" }, 
      { status: 500 }
    );
  }
}