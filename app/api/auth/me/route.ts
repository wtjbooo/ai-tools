import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessionToken = cookies().get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: true,
      },
    });

    // 校验 Session 有效性
    if (!session || session.expires < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      const response = NextResponse.json({ user: null }, { status: 401 });
      response.cookies.delete("session_token");
      return response;
    }

    // 这里的字段映射必须对齐你的 auth-provider.tsx 逻辑
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        nickname: session.user.name, // 对应前端 getDisplayName
        avatar: session.user.image,  // 对应前端 avatar
      },
    });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}