// app/api/upload/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
// 💡 回归最初的方案：引入 Prisma
import prisma from "@/lib/prisma"; 

const s3Client = new S3Client({
  region: "auto", 
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true, 
});

export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // 🛡️ 修复：兼容本地和线上的 Cookie 命名规则
    // ==========================================
    // 1. 先尝试获取本地的常规 Cookie
    let token = request.cookies.get("next-auth.session-token")?.value;
    
    // 2. 如果没获取到，说明在线上环境，尝试获取带 __Secure- 前缀的 Cookie
    if (!token) {
      token = request.cookies.get("__Secure-next-auth.session-token")?.value;
    }

    // 3. 如果还是没有，说明真没登录
    if (!token) {
      return NextResponse.json({ error: "您还没有登录，无法上传文件哦。" }, { status: 401 });
    }

    // 4. 去数据库核实 Token 是否有效
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      select: { userId: true }
    });

    if (!session) {
      return NextResponse.json({ error: "登录已失效，请重新登录。" }, { status: 401 });
    }
    // ==========================================

    // 接收前端传过来的文件名和文件类型
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: "缺少文件信息" }, { status: 400 });
    }

    // 给文件加个时间戳前缀
    const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // 创建上传指令
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFilename,
      ContentType: contentType,
    });

    // 生成预签名链接
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ 
      uploadUrl: signedUrl, 
      fileKey: uniqueFilename 
    });

  } catch (error) {
    console.error("生成预签名URL失败:", error);
    return NextResponse.json({ error: "无法生成上传链接" }, { status: 500 });
  }
}