// app/api/test-notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1. 获取当前登录的用户
    const sessionToken = cookies().get("session_token")?.value;
    if (!sessionToken) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const session = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    }

    // 2. 随机生成一种通知类型，让每次测试都有新鲜感
    const types = ["system", "billing", "task"];
    const randomType = types[Math.floor(Math.random() * types.length)];

    // 3. 往数据库里插入一条新通知！
    const notification = await prisma.notification.create({
      data: {
        userId: session.userId,
        type: randomType,
        title: "✨ 恭喜你，功能跑通了！",
        content: `这是一条 ${randomType} 类型的测试通知。你的前端面板、后端接口和数据库已经完美连通！`,
        isRead: false, // 默认是未读状态
      },
    });

    // 4. 返回成功提示
    return NextResponse.json({ 
      success: true, 
      message: "✅ 发送成功！快回到你的 XAira 控制台看看左下角吧！", 
      notification 
    });

  } catch (error) {
    console.error("[TEST_NOTIFY_ERROR]", error);
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}