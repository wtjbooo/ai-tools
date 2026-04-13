import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// 初始化 R2 客户端
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

export async function GET(request: Request) {
  // ==========================================
  // 🛡️ Vercel Cron 官方安全校验
  // ==========================================
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const results = {
      sessionsDeleted: 0,
      r2FilesDeleted: 0,
      errors: [] as string[]
    };

    // ==========================================
    // 任务一：清理过期的数据库 Session
    // ==========================================
    try {
      const deletedSessions = await prisma.session.deleteMany({
        where: {
          expires: {
            lt: new Date(),
          },
        },
      });
      results.sessionsDeleted = deletedSessions.count;
    } catch (e) {
      console.error("清理 Session 失败:", e);
      results.errors.push("Session 清理失败");
    }

    // ==========================================
    // 任务二：清理 R2 中超过 24 小时的孤儿文件
    // ==========================================
    try {
      const bucketName = process.env.R2_BUCKET_NAME;
      if (!bucketName) throw new Error("缺少 R2_BUCKET_NAME 环境变量");

      // 获取存储桶里的文件列表
      const listCommand = new ListObjectsV2Command({ Bucket: bucketName });
      const listResponse = await s3Client.send(listCommand);

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        // 筛选出超过 24 小时的文件
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const objectsToDelete = listResponse.Contents
          .filter((item) => item.LastModified && item.LastModified < twentyFourHoursAgo)
          .map((item) => ({ Key: item.Key as string }));

        if (objectsToDelete.length > 0) {
          // 批量删除
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: { Objects: objectsToDelete, Quiet: false },
          });
          const deleteResponse = await s3Client.send(deleteCommand);
          results.r2FilesDeleted = deleteResponse.Deleted?.length || 0;
        }
      }
    } catch (e) {
      console.error("清理 R2 失败:", e);
      results.errors.push("R2 清理失败");
    }

    // ==========================================
    // 返回双重任务的最终报告
    // ==========================================
    if (results.errors.length === 2) {
      return NextResponse.json({ error: "两个清理任务均执行失败，请检查后台日志" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `每日清理任务执行完毕！清理了 ${results.sessionsDeleted} 个过期 Session，以及 ${results.r2FilesDeleted} 个过期 R2 文件。`,
      details: results
    });

  } catch (error) {
    return NextResponse.json({ error: "定时任务触发异常" }, { status: 500 });
  }
}