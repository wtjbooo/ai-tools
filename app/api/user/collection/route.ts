import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // 1. 鉴权：严格复用你现有的 session_token 体系
    const sessionToken = cookies().get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    }

    // 2. 核心查询：捞取大一统表中当前用户点过爱心的数据
    const collections = await prisma.aIGenerationRecord.findMany({
      where: {
        userId: session.userId,
        isFavorited: true, // 仅拉取已收藏
      },
      orderBy: {
        updatedAt: "desc", // 按照最近收藏的时间倒序
      },
      select: {
        id: true,
        toolType: true,
        title: true,
        originalInput: true,
        resultJson: true, // 保留 json 方便你未来扩展图片展示
        createdAt: true,
        isFavorited: true,
      }
    });

    // 这里我们将原始字段映射为前端好处理的格式
    const formattedData = collections.map(item => ({
      id: item.id,
      type: item.toolType,
      title: item.title,
      prompt: item.originalInput || "无提示词记录",
      createdAt: item.createdAt.toISOString().split('T')[0], // 格式化为 YYYY-MM-DD
      isFavorited: item.isFavorited
    }));

    return NextResponse.json({ 
      success: true, 
      data: formattedData 
    });

  } catch (error) {
    console.error("[COLLECTION_GET_ERROR]", error);
    return NextResponse.json({ error: "获取收藏数据失败" }, { status: 500 });
  }
}