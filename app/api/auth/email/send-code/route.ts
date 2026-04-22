import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; 
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();
    // 兼容可能传过来的 purpose 参数，默认是 login
    const purpose = String(body.purpose || "login");

    // 1. 基础邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "请输入正确的邮箱地址" }, { status: 400 });
    }

    // 2. 防刷机制：检查 60 秒内是否已经发送过
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentCode = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        createdAt: { gte: oneMinuteAgo },
      },
    });

    if (recentCode) {
      return NextResponse.json({ error: "请求过于频繁，请 60 秒后再试" }, { status: 429 });
    }

    // 3. 生成 6 位纯数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 分钟有效期

    // 4. 落库保存
    await prisma.emailVerificationCode.create({
      data: { email, code, purpose, expiresAt },
    });

    // ==========================================
    // 🚀 【开发者终端作弊模式】
    // 无论邮件是否发成功，验证码都会立刻打印在终端！
    // ==========================================
    console.log(`\n================================`);
    console.log(`🚀 [拦截邮箱验证码] 目标: ${email}`);
    console.log(`🔑 [验证码]: ${code} (请直接在网页输入)`);
    console.log(`================================\n`);

    // 5. 真实邮件发送逻辑 (163 邮箱)
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.163.com",
        port: Number(process.env.EMAIL_PORT) || 465,
        secure: true, 
        auth: {
          user: process.env.EMAIL_USER, 
          pass: process.env.EMAIL_PASS, 
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      });

      await transporter.sendMail({
        from: `"AI 工具目录" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `验证码：${code} (AI 灵感导航)`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 20px; color: #111; border: 1px solid #f0f0f0; border-radius: 24px;">
            <h2 style="font-size: 20px; font-weight: 600;">您的登录验证码</h2>
            <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 0.2em; margin: 24px 0;">
              ${code}
            </div>
            <p style="font-size: 12px; color: #a1a1aa;">验证码 5 分钟内有效。如非本人操作请忽略。</p>
          </div>
        `,
      });
      console.log(`✅ 真实邮件发送成功！已通过 163 邮箱投递。`);
      
    } catch (mailError) {
      console.error("❌ 真实邮件发送失败:", mailError);
      console.log("👉 没关系，终端作弊模式已开启！请直接使用上方打印的验证码进行登录。");
      // 故意不抛出错误，让前端继续执行，方便你使用终端里的验证码登录
    }

    // 永远告诉前端成功了，这样输入验证码的框才会弹出来
    return NextResponse.json({ ok: true, success: true });
    
  } catch (error) {
    console.error("[Auth SendEmailCode Error]:", error);
    return NextResponse.json({ error: "服务器内部错误，请检查终端日志" }, { status: 500 });
  }
}