import prisma from "./prisma"; 

// 💡 每天免费派发的总积分额度
const DAILY_FREE_POINTS = 100; 
// 🛡️ 尊贵的 Pro 会员每日防刷安全上限（物理极限：一天 2000 分）
const DAILY_PRO_POINTS = 2000; 

/**
 * 检查并扣除积分
 * @param userId 用户 ID
 * @param cost 本次 API 调用的积分花费（默认 1）
 */
export async function checkAndDeductQuota(userId: string, cost: number = 1) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      // 🚀 修改 1：必须要在这里把 bonusCredits 查出来，否则下面拿不到！
      select: { freeUsesToday: true, lastUsedDate: true, isPro: true, bonusCredits: true } 
    });

    if (!user) {
      return { allowed: false, error: "未找到用户，请先登录。" };
    }

    // 动态判断当前用户的每日最大基础额度
    const maxAllowedPoints = user.isPro ? DAILY_PRO_POINTS : DAILY_FREE_POINTS;
    
    // 🚀 修改 2：用户的真实总额度 = 基础额度 + 购买的永久额外额度
    const totalAvailable = maxAllowedPoints + user.bonusCredits;

    const now = new Date();
    const lastUsed = user.lastUsedDate;
    let currentUsedPoints = user.freeUsesToday;

    const isToday =
      lastUsed &&
      lastUsed.getDate() === now.getDate() &&
      lastUsed.getMonth() === now.getMonth() &&
      lastUsed.getFullYear() === now.getFullYear();

    if (!isToday) {
      currentUsedPoints = 0; // 跨天重置已用次数
    }

    // 🚀 修改 3：统一使用 totalAvailable 进行拦截和报错计算
    if (currentUsedPoints + cost > totalAvailable) {
      return { 
        allowed: false, 
        error: user.isPro
          ? "您今日的高频创作已触发系统防疲劳保护，请休息一下，明日 0 点为您重新补满灵感算力！" 
          : `您的可用积分不足（需要 ${cost} 分，当前仅剩 ${totalAvailable - currentUsedPoints} 分）。请购买加油包或升级 Pro！`
      };
    }

    // 扣除动态积分，并更新最后使用时间
    await prisma.user.update({
      where: { id: userId },
      data: {
        freeUsesToday: currentUsedPoints + cost,
        lastUsedDate: now,
      },
    });

    return { 
      allowed: true, 
      // 🚀 修改 4：返回给前端的也是包含加油包的真实剩余额度
      remaining: totalAvailable - (currentUsedPoints + cost) 
    };

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { freeUsesToday: true }
    });

    if (!user) return;

    // 确保退款后，已用积分不会变成负数
    const newUsedPoints = Math.max(0, user.freeUsesToday - cost);

    await prisma.user.update({
      where: { id: userId },
      data: { freeUsesToday: newUsedPoints },
    });
    
  } catch (error) {
    console.error("退款积分时发生错误:", error);
  }
}