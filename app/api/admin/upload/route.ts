export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { isAdminAuthenticated } from "@/lib/auth";

// 初始化 Cloudflare R2 客户端
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    // 1. 验证管理员权限 (防止外人偷用你的图床)
    const ok = await isAdminAuthenticated();
    if (!ok) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 2. 获取前端传过来的文件数据
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "没有找到文件" }, { status: 400 });
    }

    // 3. 将文件转换为 Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 4. 生成安全且唯一的文件名 (存在 uploads 文件夹下)
    const uniqueSuffix = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, ""); // 过滤特殊字符
    const fileName = `uploads/${uniqueSuffix}-${safeName}`;

    // 5. 上传到 Cloudflare R2
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // 6. 返回公开访问的完整图片链接
    const publicDomain = process.env.R2_PUBLIC_DOMAIN || "";
    const url = `${publicDomain}/${fileName}`;

    return NextResponse.json({ success: true, url });

  } catch (error) {
    console.error("R2 Upload API Error:", error);
    return NextResponse.json({ error: "上传失败，请检查服务器日志" }, { status: 500 });
  }
}