// app/api/upload/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // 💡 引入 Prisma 校验用户

// 1. 初始化连通 Cloudflare R2 的客户端
const s3Client = new S3Client({
  region: "auto", // R2 必须填 auto
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  // 👇 加上这一行救命的代码，强制使用正确的路径格式！
  forcePathStyle: true, 
});

export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // 🛡️ 新增：防身逻辑 - 校验用户是否登录
    // ==========================================
    const token = request.cookies.get("next-auth.session-token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "您还没有登录，无法上传文件哦。" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      select: { userId: true }
    });

    if (!session) {
      return NextResponse.json({ error: "登录已失效，请重新登录。" }, { status: 401 });
    }
    // ==========================================


    // 2. 接收前端传过来的文件名和文件类型
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: "缺少文件信息" }, { status: 400 });
    }

    // 3. 给文件加个时间戳前缀，防止两个用户上传同名文件互相覆盖
    const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // 4. 创建上传指令
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFilename,
      ContentType: contentType,
    });

    // 5. 核心魔法：生成一个 1 小时有效期的“免死金牌”直传链接
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // 把临时链接发给前端
    return NextResponse.json({ 
      uploadUrl: signedUrl, 
      fileKey: uniqueFilename 
    });

  } catch (error) {
    console.error("生成预签名URL失败:", error);
    return NextResponse.json({ error: "无法生成上传链接" }, { status: 500 });
  }
}