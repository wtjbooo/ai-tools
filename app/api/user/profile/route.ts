import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma"; // 确保这里的 prisma 引入路径正确

export async function PATCH(req: Request) {
  try {
    // 1. 验证用户是否登录
    const sessionToken = cookies().get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    }

    // 2. 解析请求数据
    const body = await req.json();
    const { nickname, avatar } = body;

    // 3. 更新数据库 (Prisma 中对应的字段是 name 和 image)
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: nickname !== undefined ? nickname : undefined,
        image: avatar !== undefined ? avatar : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PROFILE_UPDATE_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}