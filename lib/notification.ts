import { prisma } from "@/lib/prisma"; // 引入你那个纯净的数据库实例

/**
 * 核心发信器工具
 * 用于在系统的各个角落快速向用户发送应用内通知
 */
export async function sendNotification(
  userId: string, 
  type: "system" | "billing" | "task", 
  title: string, 
  content: string
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
      },
    });
    console.log(`✅ [通知中心] 已发送给用户 ${userId}: ${title}`);
  } catch (error) {
    console.error("❌ [通知中心] 发送失败:", error);
  }
}