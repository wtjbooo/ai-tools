// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// 如果你的 prisma 报错，可以试试加上大括号：import { prisma } from "@/lib/prisma"
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

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json();
    // 💡 核心升级：增加 folder 参数，默认存入 uploads 文件夹
    const { filename, contentType, folder = "uploads" } = body;

    if (!filename || !contentType) {
      return NextResponse.json({ error: "缺少文件名或文件类型" }, { status: 400 });
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // 💡 动态拼装存储路径：文件夹名/用户ID/文件名 (例如：avatars/usr_123/168..._avatar.png)
    const fileKey = `${folder}/${session.userId}/${timestamp}-${randomString}-${safeFilename}`;

    const putCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 });

    // 提前把公开访问的图片 URL 拼好，一起返回给前端
    // 用正则去掉域名末尾可能多出的斜杠，防止出现 https://pub-xxx.com//avatars/...
    const publicDomain = process.env.R2_PUBLIC_DOMAIN?.replace(/\/$/, "");
    const publicUrl = `${publicDomain}/${fileKey}`;

    // 返回：上传通道URL，文件Key，公开访问URL
    return NextResponse.json({ uploadUrl, fileKey, publicUrl });

  } catch (error: any) {
    console.error("生成上传通道失败:", error);
    return NextResponse.json({ error: "无法获取上传通道，请检查 R2 配置" }, { status: 500 });
  }
}