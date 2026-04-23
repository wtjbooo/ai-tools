// app/api/user/history/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma"; 

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionToken = cookies().get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "会话无效或已过期" }, { status: 401 });
    }

    // 🚀 核心：从我们的“大一统流水表”里拉取该用户的所有历史记录
    const records = await prisma.aIGenerationRecord.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50, // 限制 50 条，保证速度
    });

    // 🎨 将后端的原始数据，翻译成你的精美 UI 所需要的格式
    const formattedHistory = records.map(record => {
      let platform = "AI 原生引擎";
      let tags = [`消耗 ${record.cost} 积分`];
      let thumbnail = ""; 

      // 根据不同的工具，动态分配好看的封面图和标签
      if (record.toolType === "reverse") {
        platform = "Sora / Midjourney";
        tags.push("硬核视觉解析");
        thumbnail = "https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=200&h=120&fit=crop";
      } else if (record.toolType === "enhance") {
        platform = "Gemini / GPT-4";
        tags.push("文本魔法");
        thumbnail = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&h=120&fit=crop";
      } else if (record.toolType === "search") {
        platform = "全网雷达";
        tags.push("灵感挖掘");
        thumbnail = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=200&h=120&fit=crop";
      }

      // 格式化时间 (YYYY-MM-DD HH:mm)
      const dateObj = new Date(record.createdAt);
      const timeString = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

      return {
        id: record.id,
        type: record.toolType, // 对应前端的 "reverse", "enhance", "search"
        title: record.title,
        platform: platform,
        thumbnail: thumbnail,
        prompt: record.title, // 流水表里存的是截断的摘要，刚好可以展示在这里
        tags: tags,
        createdAt: timeString
      };
    });

    return NextResponse.json({ data: formattedHistory });

  } catch (error) {
    console.error("[HISTORY_GET_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}