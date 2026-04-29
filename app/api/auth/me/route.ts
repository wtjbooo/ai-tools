// app/api/auth/me/route.ts
export const dynamic = "force-dynamic"; // 👈 致命修复：强制 Next.js 不要缓存旧头像

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma"; // 👈 同步修复大括号

export async function GET() {
  try {
    const sessionToken = cookies().get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        phone: session.user.phone,
        name: session.user.name,
        nickname: session.user.name,
        image: session.user.image,
        avatar: session.user.image, // 确保前端必定能拿到头像字段
        // 👇 核心修复：把资产和额度字段也发送给前端！
        bonusCredits: session.user.bonusCredits,
        freeUsesToday: session.user.freeUsesToday,
        isPro: session.user.isPro,
      },
    });
  } catch (error) {
    console.error("[AUTH_ME_ERROR]", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}