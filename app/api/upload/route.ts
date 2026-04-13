// app/api/upload/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
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
    const token = request.cookies.get("session_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "您还没有登录，无法上传文件哦。" }, { status: 401 });
    }

    // ==========================================
    // 🛡️ 核心优化：不仅查询 userId，还要查出 expires 过期时间
    // ==========================================
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      select: { 
        userId: true,
        expires: true // 👈 新增查询字段
      }
    });

    // 增加对 expires 的判断 (当前时间大于过期时间，即为失效)
    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已失效，请重新登录。" }, { status: 401 });
    }
    // ==========================================

    const { filename, contentType } = await request.json();

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

    return NextResponse.json({ 
      uploadUrl: signedUrl, 
      fileKey: uniqueFilename 
    });

  } catch (error) {
    console.error("生成预签名URL失败:", error);
    return NextResponse.json({ error: "无法生成上传链接" }, { status: 500 });
  }
}