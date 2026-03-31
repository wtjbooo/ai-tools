import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "邮箱和验证码不能为空" }, { status: 400 });
    }

    // 1. 查找最新的有效验证码
    const verificationRecord = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        code,
        purpose: "login",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verificationRecord) {
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
    }

    // 2. 执行登录/注册事务
    const result = await prisma.$transaction(async (tx) => {
      // 标记验证码已使用
      await tx.emailVerificationCode.update({
        where: { id: verificationRecord.id },
        data: { usedAt: new Date() },
      });

      // 查找或创建用户 [cite: 13, 15, 16]
      let user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            emailVerified: new Date(),
            name: email.split("@")[0], // 默认用户名 [cite: 13]
          },
        });
      }

      // 确保 Account 记录存在 (Provider 为 EMAIL) [cite: 17]
      await tx.account.upsert({
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

      // 创建 Session [cite: 22]
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30天有效期

      const session = await tx.session.create({
        data: {
          sessionToken,
          userId: user.id,
          expires,
        },
      });

      return { user, sessionToken, expires };
    });

    // 3. 设置 Cookie 实现持久化登录
    cookies().set("session_token", result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: result.expires,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    });
  } catch (error) {
    console.error("Verify Code Error:", error);
    return NextResponse.json({ error: "验证失败，请稍后再试" }, { status: 500 });
  }
}