// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const sessionToken = cookies().get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null });
    }

    // 查找 session 并关联带出 user 信息
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: true, // 确保查出用户的所有字段
      },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ user: null });
    }

    // 将数据库的字段完整映射给前端
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        phone: session.user.phone,
        name: session.user.name,
        nickname: session.user.name, 
        image: session.user.image, 
        avatar: session.user.image, // 💡 致命修复点：确保这里有值传给前端！
      },
    });
  } catch (error) {
    console.error("[AUTH_ME_ERROR]", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}