import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { ok: false, error: "未登录" },
        { status: 401 },
      );
    }

    const session = await prisma.session.findUnique({
      where: {
        sessionToken,
      },
      include: {
        user: true,
      },
    });

    if (!session || !session.user) {
      return NextResponse.json(
        { ok: false, error: "登录会话不存在" },
        { status: 401 },
      );
    }

    const expiresAt =
      "expiresAt" in session && session.expiresAt instanceof Date
        ? session.expiresAt
        : null;

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      await prisma.session.delete({
        where: {
          sessionToken,
        },
      });

      cookieStore.set("session_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });

      return NextResponse.json(
        { ok: false, error: "登录已过期" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: session.user.id,
        email:
          "email" in session.user && typeof session.user.email === "string"
            ? session.user.email
            : null,
        phone:
          "phone" in session.user && typeof session.user.phone === "string"
            ? session.user.phone
            : null,
        nickname:
          "nickname" in session.user &&
          typeof session.user.nickname === "string"
            ? session.user.nickname
            : null,
        name:
          "name" in session.user && typeof session.user.name === "string"
            ? session.user.name
            : null,
        avatar:
          "avatar" in session.user && typeof session.user.avatar === "string"
            ? session.user.avatar
            : null,
      },
    });
  } catch (error) {
    console.error("[AUTH_ME_GET_ERROR]", error);

    return NextResponse.json(
      { ok: false, error: "获取登录状态失败，请稍后重试" },
      { status: 500 },
    );
  }
}