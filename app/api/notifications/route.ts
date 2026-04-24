import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// 注意：这里假设你的 auth 逻辑可以通过 getServerSession 获取
// 如果你的项目有专门的 auth 配置文件，请根据实际路径调整
import { getServerSession } from "next-auth/next"; 

// 1. GET 接口：获取当前用户的所有通知
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return new NextResponse("未认证", { status: 401 });
    }

    // 先找到用户 ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) return new NextResponse("用户不存在", { status: 404 });

    // 查询该用户的所有通知，按时间倒序排列（最新的在前面）
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
    return new NextResponse("内部错误", { status: 500 });
  }
}

// 2. PATCH 接口：将所有通知标记为已读
export async function PATCH() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return new NextResponse("未认证", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) return new NextResponse("用户不存在", { status: 404 });

    // 更新该用户所有未读的通知
    await prisma.notification.updateMany({
      where: { 
        userId: user.id,
        isRead: false 
      },
      data: { isRead: true },
    });

    return NextResponse.json({ message: "全部标记为已读" });
  } catch (error) {
    console.error("[NOTIFICATIONS_PATCH]", error);
    return new NextResponse("内部错误", { status: 500 });
  }
}