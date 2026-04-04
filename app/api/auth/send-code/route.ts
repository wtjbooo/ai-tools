// app/api/auth/email/send-code/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // 保持和你项目一致的导入
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();
    const purpose = String(body.purpose || "login");

    // 1. 基础邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "请输入正确的邮箱地址" },
        { status: 400 }
      );
    }

    // 2. 防刷机制：检查 60 秒内是否已经发送过
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    
    // 🚨 注意：这里默认你的数据库表名叫 emailVerificationCode
    // 如果你点击获取验证码时报 500 错误，说明表名不对。
    // 请改成你 schema.prisma 里的名字（比如 verificationToken 或 verificationCode）
    const recentCode = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
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
    await prisma.emailVerificationCode.create({
      data: {
        email,
        code,
        purpose,
        expiresAt,
      },
    });

    // ==========================================
    // 🚀 【开发者终端作弊模式】
    // 无论邮件是否发成功，验证码都会打印在下面！
    // ==========================================
    console.log(`\n================================`);
    console.log(`🚀 [拦截邮箱验证码] 发送至: ${email}`);
    console.log(`🔑 [你的验证码是]: ${code} (请直接在网页输入)`);
    console.log(`================================\n`);

    // 5. 真实邮件发送逻辑
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.qq.com",
        port: Number(process.env.EMAIL_PORT) || 465,
        secure: true, // 465 端口必须是 true
        auth: {
          user: process.env.EMAIL_USER, 
          pass: process.env.EMAIL_PASS, 
        },
      });

      await transporter.sendMail({
        from: `"AI 工具目录" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "您的登录验证码",
        html: `
          <div style="padding: 20px; background: #f8f9fa; border-radius: 12px; font-family: sans-serif;">
            <h2 style="color: #333; margin-bottom: 20px;">您的登录验证码</h2>
            <p>您的验证码是：<strong style="font-size: 28px; color: #000; background: #fff; padding: 4px 12px; border-radius: 6px; border: 1px solid #eaeaea;">${code}</strong></p>
            <p style="color: #888; font-size: 13px; margin-top: 20px;">该验证码 5 分钟内有效。如非本人操作，请忽略。</p>
          </div>
        `,
      });
      console.log("✅ 真实邮件发送成功！请查收 QQ 邮箱。");
      
    } catch (mailError) {
      console.error("❌ 邮件发送失败（通常是 .env 配置问题或网络拦截）。");
      console.log("👉 没关系，终端作弊模式已开启！请直接使用上方打印的验证码进行登录。");
      // 故意不抛出错误，让前端继续执行，方便你使用终端里的验证码登录
    }

    // 永远告诉前端成功了，这样输入验证码的框才会弹出来
    return NextResponse.json({ ok: true });
    
  } catch (error) {
    console.error("[Auth SendEmailCode Error]:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请检查终端日志" },
      { status: 500 }
    );
  }
}