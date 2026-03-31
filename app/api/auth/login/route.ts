import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = String(body.phone || "").trim();
    const code = String(body.code || "").trim();
    const purpose = "login";

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "手机号格式不正确" }, { status: 400 });
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "验证码格式不正确" }, { status: 400 });
    }

    // 1. 查找最新且未过期、未使用的验证码
    const record = await prisma.phoneVerificationCode.findFirst({
      where: {
        phone,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record || record.code !== code) {
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
    }

    // 2. 标记验证码为已使用
    await prisma.phoneVerificationCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    // 3. 查找或创建用户 (登录/注册一体化)
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          phoneVerified: true,
          // 默认给一个脱敏的昵称
          name: `用户_${phone.slice(-4)}`,
          accounts: {
            create: {
              provider: "PHONE",
              providerAccountId: phone,
            },
          },
        },
      });
    }

    // 4. 创建 Session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30天有效

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: sessionExpiry,
      },
    });

    // 5. 设置 HttpOnly Cookie
    cookies().set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: sessionExpiry,
      path: "/",
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("[Auth Login Error]:", error);
    return NextResponse.json(
      { error: "登录失败，请稍后再试" },
      { status: 500 }
    );
  }
}