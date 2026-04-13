import prisma from "./prisma"; // 确保这里的路径能正确引入你 lib/prisma.ts 中的 prisma 实例

// 💡 这里设置每天的免费限制次数，后续如果想修改可以在这里统一改
const DAILY_FREE_LIMIT = 5; 

export async function checkAndDeductQuota(userId: string) {
  try {
    // 1. 获取当前用户的信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { freeUsesToday: true, lastUsedDate: true, isPro: true } // 为了性能，只查询需要的字段
    });

    if (!user) {
      return { allowed: false, error: "未找到用户，请先登录。" };
    }

    // 2. 如果是高级会员（Pro），直接放行，不扣除次数
    if (user.isPro) {
      return { allowed: true, remaining: "unlimited" };
    }

    // 3. 处理跨天逻辑（判断今天和最后一次使用的时间是否是同一天）
    const now = new Date();
    const lastUsed = user.lastUsedDate;
    let currentUses = user.freeUsesToday;

    const isToday =
      lastUsed &&
      lastUsed.getDate() === now.getDate() &&
      lastUsed.getMonth() === now.getMonth() &&
      lastUsed.getFullYear() === now.getFullYear();

    if (!isToday) {
      // 如果上次使用不是今天（比如昨天），或者是第一次使用（null），则重置为 0
      currentUses = 0;
    }

    // 4. 检查额度是否超限
    if (currentUses >= DAILY_FREE_LIMIT) {
      return { 
        allowed: false, 
        error: `您今天的免费次数（${DAILY_FREE_LIMIT}次）已用完，请明天再来哦！` 
      };
    }

    // 5. 扣除次数（实际是已使用次数 +1），并更新最后使用时间
    await prisma.user.update({
      where: { id: userId },
      data: {
        freeUsesToday: currentUses + 1,
        lastUsedDate: now,
      },
    });

    // 返回成功，顺便可以告诉前端还剩几次
    return { 
      allowed: true, 
      remaining: DAILY_FREE_LIMIT - (currentUses + 1) 
    };

  } catch (error) {
    console.error("检查额度时发生错误:", error);
    return { allowed: false, error: "系统繁忙，请稍后再试" };
  }
}