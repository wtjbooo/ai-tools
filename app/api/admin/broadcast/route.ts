import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // ⚠️ 现实中这里应该加一个鉴权，比如检查当前登录人是不是 ADMIN
    // 但为了让你马上能测试，我们先直接放行
    
    const body = await req.json();
    const { title, content, type = "system" } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 });
    }

    // 1. 获取全站所有用户的 ID
    const users = await prisma.user.findMany({
      select: { id: true }
    });

    // 2. 批量生成通知数据
    const notificationsData = users.map(user => ({
      userId: user.id,
      type,
      title,
      content,
      isRead: false
    }));

    // 3. 极速批量插入数据库！
    await prisma.notification.createMany({
      data: notificationsData
    });

    return NextResponse.json({ 
      success: true, 
      message: `✅ 已成功向全站 ${users.length} 名用户发送了通知！` 
    });

  } catch (error) {
    console.error("[ADMIN_BROADCAST_ERROR]", error);
    return NextResponse.json({ error: "广播失败" }, { status: 500 });
  }
}