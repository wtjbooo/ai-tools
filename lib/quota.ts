import prisma from "./prisma"; 

// 💡 每天免费派发的总积分额度
const DAILY_FREE_POINTS = 100; 
// 🛡️ 尊贵的 Pro 会员每日防刷安全上限
const DAILY_PRO_POINTS = 2000; 

/**
 * 检查并扣除积分 (先扣每日免费，不够再扣加油包)
 */
export async function checkAndDeductQuota(userId: string, cost: number = 1) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { freeUsesToday: true, lastUsedDate: true, isPro: true, bonusCredits: true } 
    });

    if (!user) {
      return { allowed: false, error: "未找到用户，请先登录。" };
    }

    const maxAllowedPoints = user.isPro ? DAILY_PRO_POINTS : DAILY_FREE_POINTS;
    const now = new Date();
    const lastUsed = user.lastUsedDate;
    let currentUsedPoints = user.freeUsesToday;

    // 跨天自动重置免费额度
    const isToday = lastUsed && lastUsed.getDate() === now.getDate() && 
                    lastUsed.getMonth() === now.getMonth() && lastUsed.getFullYear() === now.getFullYear();
    
    if (!isToday) {
      currentUsedPoints = 0; 
    }

    // 1. 计算今日剩下的免费额度
    const remainingDaily = Math.max(0, maxAllowedPoints - currentUsedPoints);

    if (remainingDaily >= cost) {
      // 🟢 情况 A：每日免费额度够用 -> 直接扣免费额度
      await prisma.user.update({
        where: { id: userId },
        data: {
          freeUsesToday: currentUsedPoints + cost,
          lastUsedDate: now,
        },
      });
      return { allowed: true, remaining: remainingDaily - cost + user.bonusCredits };
      
    } else {
      // 🟡 情况 B：每日免费不够，需要动用余额加油包
      const pointsNeededFromBonus = cost - remainingDaily;

      if (user.bonusCredits >= pointsNeededFromBonus) {
        // 加油包够扣 -> 把免费额度拉满，真实扣除加油包
        await prisma.user.update({
          where: { id: userId },
          data: {
            freeUsesToday: maxAllowedPoints, // 免费额度彻底用尽
            bonusCredits: user.bonusCredits - pointsNeededFromBonus, // 🚨 真实扣除用户买的充值包！
            lastUsedDate: now,
          },
        });
        return { allowed: true, remaining: user.bonusCredits - pointsNeededFromBonus };
      } else {
        // 🔴 情况 C：全都不够了，拒绝请求
        return { 
          allowed: false, 
          error: user.isPro
            ? "您的防疲劳保护额度及加油包均已耗尽，请稍作休息！" 
            : `可用积分不足（本次需 ${cost} 分，今日免费剩 ${remainingDaily} 分，加油包剩 ${user.bonusCredits} 分）。请购买加油包！`
        };
      }
    }

  } catch (error) {
    console.error("检查额度时发生错误:", error);
    return { allowed: false, error: "系统繁忙，积分校验失败" };
  }
}

/**
 * 任务失败时退还积分（精准退款）
 */
export async function refundQuota(userId: string, cost: number = 1) {
  try {
    // 💡 优雅退款方案：既然业务失败了，为了安抚用户，退还的积分直接进入永久加油包(bonusCredits)
    await prisma.user.update({
      where: { id: userId },
      data: { bonusCredits: { increment: cost } }, // 🚨 这里统一用 bonusCredits 退款
    });
    console.log(`✅ 通用网关回滚成功: 已为用户 ${userId} 退还 ${cost} 分到永久钱包`);
  } catch (error) {
    console.error("退款积分时发生错误:", error);
  }
}