// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma"; // 确保使用 default 引入

export async function PATCH(req: NextRequest) {
  try {
    // 1. 获取并校验 Session
    const sessionToken = cookies().get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      select: { userId: true, expires: true },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    }

    // 2. 解析前端传来的数据
    const body = await req.json();
    const { nickname, avatar } = body;

    // 3. 构建更新数据（过滤掉 undefined 的值，防止误覆盖）
    const updateData: any = {};
    if (nickname !== undefined) updateData.name = nickname;
    if (avatar !== undefined) updateData.image = avatar; 

    // 4. 更新数据库
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
    });

    // 5. 返回成功响应
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        image: updatedUser.image,
      },
    });

  } catch (error) {
    // 将详细错误打印到 Vercel 或本地终端，方便排查
    console.error("[PROFILE_PATCH_ERROR]:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}