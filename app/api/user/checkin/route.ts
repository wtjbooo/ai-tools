import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DAILY_CHECKIN_REWARD, PRO_DAILY_REWARD } from "@/lib/pricing";

// 公共的鉴权与获取用户逻辑
async function getAuthenticatedUser(req: NextRequest) {
  const sessionToken = req.cookies.get("session_token")?.value;
  const lxSession = req.cookies.get("lx_session")?.value;

  if (!sessionToken && !lxSession) return null;

  return await prisma.user.findFirst({
    where: {
      sessions: {
        some: { sessionToken: sessionToken || lxSession }
      }
    }
  });
}

// 🚀 GET：让前端一加载页面，就能查询今天是否已经签到
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, hasCheckedInToday: false });

    if (!user.lastCheckInAt) {
      return NextResponse.json({ success: true, hasCheckedInToday: false });
    }

    const now = new Date();
    const lastCheckInDate = new Date(user.lastCheckInAt);
    
    // 判断最后签到时间是否是今天
    const isSameDay = 
      lastCheckInDate.getFullYear() === now.getFullYear() &&
      lastCheckInDate.getMonth() === now.getMonth() &&
      lastCheckInDate.getDate() === now.getDate();

    return NextResponse.json({ success: true, hasCheckedInToday: isSameDay });
  } catch (error) {
    return NextResponse.json({ success: false, hasCheckedInToday: false });
  }
}

// 🚀 POST：执行签到动作并根据 Pro 身份发放积分
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });

    const now = new Date();
    
    // 检查是否重复签到
    if (user.lastCheckInAt) {
      const lastCheckInDate = new Date(user.lastCheckInAt);
      const isSameDay = 
        lastCheckInDate.getFullYear() === now.getFullYear() &&
        lastCheckInDate.getMonth() === now.getMonth() &&
        lastCheckInDate.getDate() === now.getDate();
        
      if (isSameDay) {
        return NextResponse.json({ success: false, error: "今日已领取过算力" }, { status: 400 });
      }
    }

    // 💡 核心：根据身份发放对应积分 (Pro 会员拿 500，普通拿 100)
    const rewardAmount = user.isPro ? PRO_DAILY_REWARD : DAILY_CHECKIN_REWARD;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        bonusCredits: { increment: rewardAmount },
        lastCheckInAt: now,
      },
    });

    return NextResponse.json({ 
      success: true, 
      amount: rewardAmount,
      isPro: user.isPro,
      message: `签到成功，已放入 ${rewardAmount} 积分`
    });

  } catch (error: any) {
    console.error("签到接口错误:", error);
    return NextResponse.json({ success: false, error: "签到服务器异常" }, { status: 500 });
  }
}