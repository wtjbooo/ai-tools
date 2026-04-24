// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// 1. GET 接口：获取当前用户的所有通知
export async function GET(req: NextRequest) {
  try {
    // 💡 使用你专属的 Cookie 鉴权逻辑
    const sessionToken = cookies().get("session_token")?.value;
    if (!sessionToken) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const session = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    }

    // 查询该用户的所有通知，按时间倒序排列（最新的在前面）
    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("[NOTIFICATIONS_GET_ERROR]", error);
    return NextResponse.json({ error: "内部错误" }, { status: 500 });
  }
}

// 2. PATCH 接口：将所有通知标记为已读
export async function PATCH(req: NextRequest) {
  try {
    // 💡 同样的鉴权逻辑
    const sessionToken = cookies().get("session_token")?.value;
    if (!sessionToken) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const session = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    }

    // 更新该用户所有未读的通知为已读
    await prisma.notification.updateMany({
      where: { 
        userId: session.userId,
        isRead: false 
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, message: "全部标记为已读" });
  } catch (error) {
    console.error("[NOTIFICATIONS_PATCH_ERROR]", error);
    return NextResponse.json({ error: "内部错误" }, { status: 500 });
  }
}