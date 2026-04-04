// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma"; // 👈 致命修复：必须加这层大括号

export async function PATCH(req: NextRequest) {
  try {
    const sessionToken = cookies().get("session_token")?.value;
    if (!sessionToken) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const session = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    }

    const body = await req.json();
    const { nickname, avatar } = body;

    // 严谨的更新逻辑：只有当有真实值时才覆盖，防止被空字符串洗掉
    const updateData: any = {};
    if (nickname) updateData.name = nickname;
    if (avatar) updateData.image = avatar; 

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("[PROFILE_PATCH_ERROR]", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}