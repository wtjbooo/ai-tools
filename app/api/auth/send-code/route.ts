import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 真实的短信发送函数占位（后续替换为阿里云/腾讯云 SDK）
async function sendSmsViaCloud(phone: string, code: string) {
  // TODO: 接入真实云厂商 SDK
  // 仅在开发环境下打印到控制台，模拟真实发送延迟
  if (process.env.NODE_ENV === "development") {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`\n================================`);
    console.log(`🚀 [MOCK SMS] 发送至: ${phone}`);
    console.log(`🔑 [MOCK SMS] 验证码: ${code} (5分钟内有效)`);
    console.log(`================================\n`);
    return true;
  }
  
  // 生产环境下如果没有配置真实 SDK，先默认通过（或根据需要抛错）
  console.log(`[SMS] code ${code} sent to ${phone}`);
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = String(body.phone || "").trim();
    const purpose = String(body.purpose || "login");

    // 1. 基础手机号格式校验 (中国大陆 11 位)
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: "请输入正确的手机号码" },
        { status: 400 }
      );
    }

    // 2. 防刷机制：检查 60 秒内是否已经发送过
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentCode = await prisma.phoneVerificationCode.findFirst({
      where: {
        phone,
        purpose,
        createdAt: {
          gte: oneMinuteAgo,
        },
      },
    });

    if (recentCode) {
      return NextResponse.json(
        { error: "请求过于频繁，请 60 秒后再试" },
        { status: 429 }
      );
    }

    // 3. 生成 6 位纯数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 分钟有效期

    // 4. 落库保存
    await prisma.phoneVerificationCode.create({
      data: {
        phone,
        code,
        purpose,
        expiresAt,
      },
    });

    // 5. 调用底层服务发送短信
    const sendResult = await sendSmsViaCloud(phone, code);
    
    if (!sendResult) {
      return NextResponse.json(
        { error: "短信发送失败，请稍后重试" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Auth SendCode Error]:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后再试" },
      { status: 500 }
    );
  }
}