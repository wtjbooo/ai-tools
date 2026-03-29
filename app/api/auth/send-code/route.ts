import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_EXPIRES_MINUTES = 10;

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function normalizePhone(input: string) {
  return input.replace(/\s+/g, "").trim();
}

function isValidChinaMainlandPhone(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone);
}

function generateCode() {
  const testCode = process.env.SMS_TEST_CODE?.trim();
  if (testCode) return testCode;

  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawPhone = String(body?.phone || "");
    const purpose = String(body?.purpose || "login").trim() || "login";
    const phone = normalizePhone(rawPhone);

    if (!phone) {
      return jsonError("请输入手机号。", 400);
    }

    if (!isValidChinaMainlandPhone(phone)) {
      return jsonError("手机号格式不正确。", 400);
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000);

    await prisma.phoneVerificationCode.create({
      data: {
        phone,
        code,
        purpose,
        expiresAt,
      },
    });

    // 现在先不真正调用短信服务商。
    // 开发期直接返回 devCode，方便你联调前端。
    return NextResponse.json({
      ok: true,
      message: "验证码已发送。",
      devCode:
        process.env.NODE_ENV === "development" ? code : undefined,
      expiresInMinutes: CODE_EXPIRES_MINUTES,
    });
  } catch (error) {
    console.error("send code error:", error);
    return jsonError("发送验证码失败，请稍后再试。", 500);
  }
}