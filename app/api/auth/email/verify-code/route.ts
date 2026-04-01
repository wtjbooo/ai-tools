import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "邮箱和验证码不能为空" }, { status: 400 });
    }

    // 1. 查找最新的一条有效验证码
    const record = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        code,
        purpose: "login",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
    }

    // 2. 标记验证码已使用
    await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    // 3. 查找或创建用户 (Upsert 模式)
    // 逻辑：如果邮箱已存在，直接用该用户；不存在则新建
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          emailVerified: new Date(),
          name: email.split("@")[0], // 默认名字取邮箱前缀
        },
      });
    } else if (!user.emailVerified) {
      // 如果用户存在但未标记验证，顺手更新一下
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    // 4. 确保 Account 表有关联 (符合你一个 User 多个 Account 的思路)
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "EMAIL",
          providerAccountId: email,
        },
      },
      update: {},
      create: {
        userId: user.id,
        provider: "EMAIL",
        providerAccountId: email,
      },
    });

    // 5. 创建 Session
    const sessionToken = crypto.randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30天有效期

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    });

    // 6. 设置 Cookie
    cookies().set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VERIFY_CODE_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误，请稍后再试" }, { status: 500 });
  }
}