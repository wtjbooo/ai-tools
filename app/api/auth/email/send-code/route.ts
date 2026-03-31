import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";

// 创建邮件传输对象
const transporter = nodemailer.createTransport({
  host: "smtp.qq.com", // 如果是 163 邮箱请改为 smtp.163.com
  port: 465,
  secure: true, // 使用 SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    }

    // 1. 防刷机制：检查 60 秒内是否已经发送过
    const recentCode = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        createdAt: {
          gt: new Date(Date.now() - 60 * 1000),
        },
      },
    });

    if (recentCode) {
      return NextResponse.json({ error: "发送太频繁，请稍后再试" }, { status: 429 });
    }

    // 2. 生成 6 位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 分钟有效期

    // 3. 写入数据库
    await prisma.emailVerificationCode.create({
      data: {
        email,
        code,
        purpose: "login",
        expiresAt,
      },
    });

    // 4. 发送真实邮件
    await transporter.sendMail({
      from: `"AI 工具目录" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `验证码：${code} (AI 工具目录)`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 20px; color: #111; background-color: #ffffff; border: 1px solid #f0f0f0; border-radius: 24px;">
          <div style="margin-bottom: 32px;">
            <span style="font-size: 13px; font-weight: 500; color: #71717a; border: 1px solid #e4e4e7; padding: 4px 12px; border-radius: 100px; letter-spacing: 0.05em;">SIGN IN</span>
          </div>
          <h2 style="font-size: 22px; font-weight: 600; tracking: -0.02em; margin-bottom: 12px; color: #09090b;">验证您的邮箱</h2>
          <p style="font-size: 14px; color: #71717a; margin-bottom: 32px; line-height: 1.5;">
            请在登录页面输入以下 6 位验证码。该代码将在 5 分钟后失效。
          </p>
          <div style="background: #f4f4f5; border-radius: 16px; padding: 24px; text-align: center; font-size: 36px; font-weight: 700; letter-spacing: 0.25em; color: #09090b; font-variant-numeric: tabular-nums;">
            ${code}
          </div>
          <p style="font-size: 12px; color: #a1a1aa; margin-top: 40px;">
            如果您没有请求此验证码，请忽略此邮件。
          </p>
          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #f4f4f5;">
            <p style="font-size: 12px; color: #71717a;">© 2026 AI 工具目录</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MAIL_ERROR]", error);
    return NextResponse.json({ error: "邮件服务连接失败，请检查配置" }, { status: 500 });
  }
}