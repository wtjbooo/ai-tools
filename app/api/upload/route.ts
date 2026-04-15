import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "@/lib/prisma";

// 1. 初始化 R2 客户端
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

export async function POST(req: NextRequest) {
  try {
    // 1. 基础鉴权：确保只有登录用户才能上传文件
    const token = req.cookies.get("session_token")?.value 
               || req.cookies.get("next-auth.session-token")?.value 
               || req.cookies.get("__Secure-next-auth.session-token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      select: { userId: true, expires: true }
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已失效，请重新登录" }, { status: 401 });
    }

    // 2. 💡 核心修复：接收前端发来的 JSON 数据
    const body = await req.json();
    const { filename, contentType } = body;

    if (!filename || !contentType) {
      return NextResponse.json({ error: "缺少文件名或文件类型" }, { status: 400 });
    }

    // 3. 生成云端存储的唯一文件路径 (FileKey)
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    // 过滤掉文件名里的奇怪字符，防止 R2 报错
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `uploads/${session.userId}/${timestamp}-${randomString}-${safeFilename}`;

    // 4. 向 Cloudflare R2 申请一个准许上传的“通行证” (预签名 URL)
    const putCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
    });

    // 生成一个有效期为 1 小时的直传链接
    const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 });

    // 5. 将链接和 Key 返回给前端
    return NextResponse.json({ uploadUrl, fileKey });

  } catch (error: any) {
    console.error("生成上传通道失败:", error);
    return NextResponse.json({ error: "无法获取上传通道，请检查 R2 配置" }, { status: 500 });
  }
}