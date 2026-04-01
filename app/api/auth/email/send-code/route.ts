import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.qq.com",
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // 注意：这里必须是 QQ 邮箱的“授权码”，不是登录密码
  },
  // 增加超时配置，防止网络抖动导致的连接失败
  connectionTimeout: 10000, 
  greetingTimeout: 10000,
});

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    }

    // 1. 防刷：检查 60 秒内记录
    const recentCode = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentCode) {
      return NextResponse.json({ error: "发送太频繁，请稍后再试" }, { status: 429 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 2. 写入数据库
    await prisma.emailVerificationCode.create({
      data: { email, code, purpose: "login", expiresAt },
    });

    // 3. 发送邮件
    try {
      await transporter.sendMail({
        from: `"AI 工具目录" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `验证码：${code} (AI 工具目录)`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 20px; color: #111; border: 1px solid #f0f0f0; border-radius: 24px;">
            <h2 style="font-size: 20px; font-weight: 600;">验证您的邮箱</h2>
            <p style="font-size: 14px; color: #71717a; margin-bottom: 24px;">您的登录验证码为：</p>
            <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 0.2em;">
              ${code}
            </div>
            <p style="font-size: 12px; color: #a1a1aa; margin-top: 30px;">验证码 5 分钟内有效。如非本人操作请忽略。</p>
          </div>
        `,
      });
    } catch (mailErr) {
      // 如果邮件发送失败，为了用户体验，我们应该在控制台打印详情，但返回给前端友好的提示
      console.error("具体的邮件服务错误详情:", mailErr);
      throw new Error("SMTP_FAILED"); 
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[MAIL_ERROR]", error);
    
    // 如果是邮件配置问题
    if (error.message === "SMTP_FAILED") {
      return NextResponse.json({ error: "邮件推送服务暂时不可用，请稍后再试" }, { status: 500 });
    }
    
    // 可能是数据库连接问题（比如 Neon 欠费或断连）
    return NextResponse.json({ error: "系统繁忙，请检查网络或配置" }, { status: 500 });
  }
}