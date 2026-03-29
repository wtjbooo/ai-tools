import { createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "lx_session";
const SESSION_EXPIRES_DAYS = 30;

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function normalizePhone(input: string) {
  return input.replace(/\s+/g, "").trim();
}

function isValidChinaMainlandPhone(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone);
}

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("服务端未配置 AUTH_SESSION_SECRET");
  }
  return secret;
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createSessionToken(payload: Record<string, unknown>) {
  const secret = getSessionSecret();
  const json = JSON.stringify(payload);
  const encoded = base64UrlEncode(json);

  const signature = createHmac("sha256", secret)
    .update(encoded)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${encoded}.${signature}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawPhone = String(body?.phone || "");
    const rawCode = String(body?.code || "");
    const purpose = String(body?.purpose || "login").trim() || "login";

    const phone = normalizePhone(rawPhone);
    const code = rawCode.trim();

    if (!phone) {
      return jsonError("请输入手机号。", 400);
    }

    if (!isValidChinaMainlandPhone(phone)) {
      return jsonError("手机号格式不正确。", 400);
    }

    if (!/^\d{4,8}$/.test(code)) {
      return jsonError("验证码格式不正确。", 400);
    }

    const now = new Date();

    const verification = await prisma.phoneVerificationCode.findFirst({
      where: {
        phone,
        code,
        purpose,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!verification) {
      return jsonError("验证码无效或已过期。", 400);
    }

    await prisma.phoneVerificationCode.update({
      where: { id: verification.id },
      data: {
        usedAt: now,
      },
    });

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          {
            accounts: {
              some: {
                provider: "PHONE",
                providerAccountId: phone,
              },
            },
          },
        ],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          phoneVerified: true,
          accounts: {
            create: {
              provider: "PHONE",
              providerAccountId: phone,
            },
          },
        },
      });
    } else {
      const existingPhoneAccount = await prisma.account.findFirst({
        where: {
          userId: user.id,
          provider: "PHONE",
          providerAccountId: phone,
        },
      });

      const updates: {
        phone?: string;
        phoneVerified?: boolean;
      } = {};

      if (!user.phone) {
        updates.phone = phone;
      }

      if (!user.phoneVerified) {
        updates.phoneVerified = true;
      }

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
      }

      if (!existingPhoneAccount) {
        await prisma.account.create({
          data: {
            userId: user.id,
            provider: "PHONE",
            providerAccountId: phone,
          },
        });
      }
    }

    const sessionToken = randomBytes(32).toString("hex");
    const expires = new Date(
      Date.now() + SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    });

    const signedToken = createSessionToken({
      sessionToken,
      userId: user.id,
      phone,
      exp: expires.getTime(),
    });

    cookies().set({
      name: SESSION_COOKIE_NAME,
      value: signedToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        phone,
        role: user.role,
      },
      expires,
    });
  } catch (error) {
    console.error("verify code error:", error);
    return jsonError(
      error instanceof Error && error.message.includes("AUTH_SESSION_SECRET")
        ? error.message
        : "登录失败，请稍后再试。",
      500,
    );
  }
}