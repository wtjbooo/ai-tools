import { createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs"; // 👈 引入我们刚才安装的加密库

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "lx_session";
const SESSION_EXPIRES_DAYS = 30;

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

// 借用你之前的 Session 签名加密逻辑，非常安全！
function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET?.trim();
  if (!secret) throw new Error("服务端未配置 AUTH_SESSION_SECRET");
  return secret;
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createSessionToken(payload: Record<string, unknown>) {
  const secret = getSessionSecret();
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encoded).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${encoded}.${signature}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const code = String(body?.code || "").trim();
    const password = String(body?.password || "").trim();

    if (!email) return jsonError("请输入邮箱", 400);

    let user = await prisma.user.findUnique({ where: { email } });

    // ==========================================
    // 🛡️ 场景 1: 密码登录 (有密码，无验证码)
    // ==========================================
    if (password && !code) {
      if (!user || !user.password) {
        return jsonError("账号不存在或未设置密码，请使用验证码登录并设置", 400);
      }
      
      // 使用 bcrypt 比对数据库中的哈希密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return jsonError("邮箱或密码错误", 400);
      }
    } 
    // ==========================================
    // 🛡️ 场景 2: 验证码登录 / 注册 (可选是否设置新密码)
    // ==========================================
    else if (code) {
      // 1. 校验邮箱验证码 (查找 EmailVerificationCode 表)
      const verification = await prisma.emailVerificationCode.findFirst({
        where: {
          email,
          code,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!verification) return jsonError("验证码无效或已过期", 400);

      // 2. 标记验证码为已使用
      await prisma.emailVerificationCode.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });

      // 3. 处理密码加密 (如果用户输入了密码，就哈希处理它)
      let hashedPassword = undefined;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      // 4. 注册或更新用户
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            emailVerified: new Date(),
            password: hashedPassword, // 存入加密后的密码
            accounts: {
              create: { provider: "EMAIL", providerAccountId: email },
            },
          },
        });
      } else {
        // 老用户如果这次输入了新密码，就帮他更新密码
        const updates: any = { emailVerified: new Date() };
        if (hashedPassword) updates.password = hashedPassword;
        
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
      }
    } else {
      return jsonError("请输入密码或验证码", 400);
    }

// ==========================================
    // 🎟️ 生成通行证 Session (登录成功后的共用逻辑)
    // ==========================================
    const sessionToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: { sessionToken, userId: user.id, expires },
    });

    const signedToken = createSessionToken({
      sessionToken, userId: user.id, email, exp: expires.getTime(),
    });

    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires,
    };

    // 1. 发送签名版通行证 (lx_session)
    cookies().set(SESSION_COOKIE_NAME, signedToken, cookieOptions);

    // 2. 补发基础版通行证 (session_token)，确保前端 100% 能认出你！
    cookies().set("session_token", sessionToken, cookieOptions);

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email, role: user.role },
    });

  } catch (error) {
    console.error("[Auth Login Error]:", error);
    return jsonError("登录系统遇到点小问题，请稍后再试", 500);
  }
}