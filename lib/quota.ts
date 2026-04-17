import prisma from "./prisma"; 

// 💡 每天免费派发的总积分额度
const DAILY_FREE_POINTS = 100; 
// 🛡️ 尊贵的 Pro 会员每日防刷安全上限（物理极限：一天 2000 分，普通人绝不可能点完）
const DAILY_PRO_POINTS = 2000; 

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

    // 2. 动态判断当前用户的每日最大额度
    const maxAllowedPoints = user.isPro ? DAILY_PRO_POINTS : DAILY_FREE_POINTS;

    // 3. 处理跨天逻辑
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

    // 4. 统一拦截：不管是不是 Pro，只要加上本次花费超过了他的最大额度，统统拦截！
    if (currentUsedPoints + cost > maxAllowedPoints) {
      return { 
        allowed: false, 
        error: user.isPro
          ? "您今日的高频创作已触发系统防疲劳保护，请休息一下，明日 0 点为您重新补满灵感算力！" // Pro 用户的体贴提示
          : `您的免费积分不足（需要 ${cost} 分，今日仅剩 ${maxAllowedPoints - currentUsedPoints} 分）。请升级 Pro 解锁更多额度！` // 普通用户的催氪提示
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

    // 6. 返回成功，计算真实的剩余积分
    return { 
      allowed: true, 
      remaining: maxAllowedPoints - (currentUsedPoints + cost) 
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
      select: { freeUsesToday: true, isPro: true } // 这里还需要查 isPro 吗？其实不用区别对待了，但为了严谨我们保留
    });

    if (!user) return;

    // 🚨 升级点：既然 Pro 用户也扣除内部积分了，那么失败了同样要给他们精准退款！
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