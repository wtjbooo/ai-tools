import prisma from "./prisma"; 

// 💡 每天免费派发的总积分额度（你可以根据需要调大）
const DAILY_FREE_POINTS = 100; 

/**
 * 检查并扣除积分
 * @param userId 用户 ID
 * @param cost 本次 API 调用的积分花费（默认 1）
 */
export async function checkAndDeductQuota(userId: string, cost: number = 1) {
  try {
    // 1. 获取当前用户的信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { freeUsesToday: true, lastUsedDate: true, isPro: true } 
    });

    if (!user) {
      return { allowed: false, error: "未找到用户，请先登录。" };
    }

    // 2. 如果是高级会员（Pro），直接放行，不扣除积分
    if (user.isPro) {
      return { allowed: true, remaining: "unlimited" };
    }

    // 3. 处理跨天逻辑（判断今天和最后一次扣费的时间是否是同一天）
    const now = new Date();
    const lastUsed = user.lastUsedDate;
    let currentUsedPoints = user.freeUsesToday;

    const isToday =
      lastUsed &&
      lastUsed.getDate() === now.getDate() &&
      lastUsed.getMonth() === now.getMonth() &&
      lastUsed.getFullYear() === now.getFullYear();

    if (!isToday) {
      // 如果上次使用不是今天，重置已用积分为 0
      currentUsedPoints = 0;
    }

    // 4. 检查加上本次花费后，积分是否超限
    if (currentUsedPoints + cost > DAILY_FREE_POINTS) {
      return { 
        allowed: false, 
        error: `您的免费积分不足（需要 ${cost} 分，今日仅剩 ${DAILY_FREE_POINTS - currentUsedPoints} 分）。请升级 Pro 解锁更多额度！` 
      };
    }

    // 5. 扣除积分（累加已用积分），并更新最后使用时间
    await prisma.user.update({
      where: { id: userId },
      data: {
        freeUsesToday: currentUsedPoints + cost,
        lastUsedDate: now,
      },
    });

    // 返回成功，计算剩余积分
    return { 
      allowed: true, 
      remaining: DAILY_FREE_POINTS - (currentUsedPoints + cost) 
    };

  } catch (error) {
    console.error("检查额度时发生错误:", error);
    return { allowed: false, error: "系统繁忙，积分校验失败" };
  }
}

/**
 * 任务失败时退还积分（精准退款）
 * @param userId 用户 ID
 * @param cost 需要退回的积分数量
 */
export async function refundQuota(userId: string, cost: number = 1) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { freeUsesToday: true, isPro: true }
    });

    // 如果找不到用户或者是 Pro 用户，无需退款
    if (!user || user.isPro) return;

    // 确保退款后，已用积分不会变成负数
    const newUsedPoints = Math.max(0, user.freeUsesToday - cost);

    await prisma.user.update({
      where: { id: userId },
      data: {
        freeUsesToday: newUsedPoints,
      },
    });
    
    console.log(`✅ 已成功为用户 ${userId} 退还 ${cost} 积分`);
  } catch (error) {
    console.error("退款积分时发生错误:", error);
  }
}