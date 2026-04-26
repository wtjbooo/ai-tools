import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // 引入数据库
import { DAILY_CHECKIN_REWARD } from "@/lib/pricing"; // 引入中央物价局的签到额度

export async function POST(req: NextRequest) {
  try {
    // 1. 解析 Cookie 鉴权 (匹配交接文档中的双重通行证)
    const sessionToken = req.cookies.get("session_token")?.value;
    const lxSession = req.cookies.get("lx_session")?.value;

    if (!sessionToken && !lxSession) {
      return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
    }

    // 2. 获取当前用户 (请根据你的实际 Session 逻辑调整查询条件)
    const user = await prisma.user.findFirst({
      where: {
        sessions: {
          some: { sessionToken: sessionToken || lxSession }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "用户不存在" }, { status: 404 });
    }

    const now = new Date();
    
    // 3. 检查今日是否已签到
    if (user.lastCheckInAt) {
      const lastCheckInDate = new Date(user.lastCheckInAt);
      // 将时间抹平到凌晨 0 点，比较年月日是否相同
      const isSameDay = 
        lastCheckInDate.getFullYear() === now.getFullYear() &&
        lastCheckInDate.getMonth() === now.getMonth() &&
        lastCheckInDate.getDate() === now.getDate();
        
      if (isSameDay) {
        return NextResponse.json({ success: false, error: "今日已领取过算力" }, { status: 400 });
      }
    }

    // 4. 发放积分并更新签到时间
    await prisma.user.update({
      where: { id: user.id },
      data: {
        bonusCredits: { increment: DAILY_CHECKIN_REWARD },
        lastCheckInAt: now,
      },
    });

    return NextResponse.json({ 
      success: true, 
      amount: DAILY_CHECKIN_REWARD,
      message: `签到成功，已放入 ${DAILY_CHECKIN_REWARD} 积分`
    });

  } catch (error: any) {
    console.error("签到接口错误:", error);
    return NextResponse.json({ success: false, error: "签到服务器异常" }, { status: 500 });
  }
}