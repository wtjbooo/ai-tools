import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  // ==========================================
  // 🛡️ 新增：Vercel Cron 官方安全校验
  // 只有请求头里带着正确的 CRON_SECRET，才允许执行
  // ==========================================
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 🧹 一键删除所有 expires 时间早于当前时间的 Session
    const deleted = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: `成功清理了 ${deleted.count} 个过期 Session` 
    });
  } catch (error) {
    return NextResponse.json({ error: "清理失败" }, { status: 500 });
  }
}