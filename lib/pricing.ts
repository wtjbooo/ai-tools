// lib/pricing.ts

// ==========================================
// 🎁 运营福利与商业化全局配置
// ==========================================
export const DAILY_CHECKIN_REWARD = 100;      // 普通用户签到奖励
export const PRO_DAILY_REWARD = 500;         // Pro 会员签到奖励 (大幅提升)

/**
 * XAira 全局 AI 算力计费中心 (中央物价局)
 * @param modelName 前端传来的模型名称 (如 "gemini-flash", "claude-4.6-sonnet")
 * @param taskType 任务类型：'text' (纯文本) | 'vision' (视觉反推) | 'image_gen' (AI绘图) | 'video_gen' (AI视频)
 * @returns 需要扣除的积分数量
 */
export function getModelCost(
  modelName: string, 
  taskType: 'text' | 'vision' | 'image_gen' | 'video_gen' = 'text'
): number {
  // 转小写，方便统一匹配
  const name = (modelName || "").toLowerCase();

  // ==========================================
  // 🎬 视频生成任务 (终极吞金兽)
  // ==========================================
  if (taskType === 'video_gen') {
    return 150; // 视频极度烧钱，100 免费积分都不够生成一次，必须充值！
  }

  // ==========================================
  // 🎨 图像生成任务 (Midjourney/Flux 等)
  // ==========================================
  if (taskType === 'image_gen') {
    return 30; // 相当于免费积分每天能抽 3 次
  }

  // ==========================================
  // 👁️ 视觉任务 (反推提示词) - 图文多模态极耗 Token
  // ==========================================
  if (taskType === 'vision') {
    // 1. 自建便宜模型 (Gemini Flash) -> 扣 5 分 (每天可白嫖 20 次)
    if (name.includes('flash') || name.includes('deepseek')) return 5;
    
    // 2. 中端视觉模型 (GPT-4o-mini 等) -> 扣 15 分 (每天可白嫖 6 次)
    if (name.includes('mini') || name.includes('kimi')) return 15;
    
    // 3. 顶级旗舰视觉 (Claude Sonnet/Opus, 满血 GPT-4o) -> 狠狠扣 40 分！
    if (name.includes('pro') || name.includes('sonnet') || name.includes('opus') || name === 'gpt-5.4' || name === 'gpt-4o') return 40;
    
    return 20; // 兜底
  }

  // ==========================================
  // 📝 文本任务 (魔法扩写 / 聚合搜索)
  // ==========================================
  
  // 1. 引流级纯文本 (自有免费 Key 或极便宜模型) -> 扣 2 分
  if (name.includes('flash') || name.includes('deepseek') || name.includes('doubao')) return 2;

  // 2. 中端进阶文本 (mini / kimi 等) -> 扣 8 分
  if (name.includes('kimi') || name.includes('mini')) return 8;

  // 3. 顶级旗舰文本 (高倍率中转站模型) -> 扣 25 分
  if (name.includes('pro') || name.includes('sonnet') || name.includes('opus') || name === 'gpt-5.4' || name === 'gpt-4o') return 25;

  // 🛡️ 兜底防护
  return 10;
}