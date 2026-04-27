import { createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs"; 

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "lx_session";
const SESSION_EXPIRES_DAYS = 30;

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

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

// 🛡️ 新增：数据库查询自动重试助手
// 当遇到连接关闭时，它会自动帮我们重试 1 次，避免直接抛出错误
async function safeDbQuery<T>(queryFn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await queryFn();
  } catch (error: any) {
    // 检测是否为 Prisma 连接错误或 Closed 错误
    const isConnectionError = error.message?.includes("Closed") || error.code === "P2024" || error.code === "P2021";
    if (retries > 0 && isConnectionError) {
      console.warn("♻️ 数据库连接不稳定，正在尝试重新查询...");
      // 等待 200 毫秒后重试
      await new Promise(resolve => setTimeout(resolve, 200));
      return await safeDbQuery(queryFn, retries - 1);
    }
    throw error; // 如果不是连接错误，或者重试次数用光了，就抛出错误让 catch 处理
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const code = String(body?.code || "").trim();
    const password = String(body?.password || "").trim();

    if (!email) return jsonError("请输入邮箱", 400);

    // 🛡️ 使用 safeDbQuery 包裹数据库操作
    let user = await safeDbQuery(() => prisma.user.findUnique({ where: { email } }));

    if (password && !code) {
      if (!user || !user.password) {
        return jsonError("账号不存在或未设置密码，请使用验证码登录并设置", 400);
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return jsonError("邮箱或密码错误", 400);
      }
    } 
    else if (code) {
      // 🛡️ 使用 safeDbQuery 包裹数据库操作
      const verification = await safeDbQuery(() => prisma.emailVerificationCode.findFirst({
        where: {
          email,
          code,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      }));

      if (!verification) return jsonError("验证码无效或已过期", 400);

      // 🛡️ 使用 safeDbQuery 包裹数据库操作
      await safeDbQuery(() => prisma.emailVerificationCode.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }));

      let hashedPassword = undefined;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      if (!user) {
        // 🛡️ 使用 safeDbQuery 包裹数据库操作
        user = await safeDbQuery(() => prisma.user.create({
          data: {
            email,
            emailVerified: new Date(),
            password: hashedPassword,
            accounts: {
              create: { provider: "EMAIL", providerAccountId: email },
            },
          },
        }));
      } else {
        const updates: any = { emailVerified: new Date() };
        if (hashedPassword) updates.password = hashedPassword;
        
        // 🛡️ 使用 safeDbQuery 包裹数据库操作
        user = await safeDbQuery(() => prisma.user.update({
          where: { id: user!.id }, 
          data: updates,
        }));
      }
    } else {
      return jsonError("请输入密码或验证码", 400);
    }

    const sessionToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    // 🛡️ 使用 safeDbQuery 包裹数据库操作
    await safeDbQuery(() => prisma.session.create({
      data: { sessionToken, userId: user!.id, expires },
    }));

    const signedToken = createSessionToken({
      sessionToken, userId: user!.id, email, exp: expires.getTime(),
    });

    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires,
    };

    cookies().set(SESSION_COOKIE_NAME, signedToken, cookieOptions);
    cookies().set("session_token", sessionToken, cookieOptions);

    return NextResponse.json({
      ok: true,
      user: { id: user!.id, email, role: user!.role },
    });

  } catch (error: any) {
    // 💡 改进错误日志：打印更详细的信息以便排查
    console.error("[Auth Login Error]:", error.message || error);
    return jsonError("登录系统遇到点小问题，请稍后再试", 500);
  }
}