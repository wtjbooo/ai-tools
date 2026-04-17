// lib/pricing.ts

/**
 * XAira 全局 AI 算力计费中心 (中央物价局)
 * @param modelName 前端传来的模型名称 (如 "gemini-flash", "claude-4.6-sonnet")
 * @param taskType 任务类型：'text' (扩写/搜索) | 'vision' (图片反推)
 * @returns 需要扣除的积分数量
 */
export function getModelCost(modelName: string, taskType: 'text' | 'vision' = 'text'): number {
  // 转小写，方便统一匹配
  const name = (modelName || "").toLowerCase();

  // ==========================================
  // 👁️ 视觉任务 (反推提示词) - 统一溢价
  // 视觉任务需要上传图片，Token 消耗巨大，必须加价！
  // ==========================================
  if (taskType === 'vision') {
    // 自有的免费/便宜模型做视觉，扣 2 分
    if (name.includes('flash') || name.includes('deepseek')) return 2;
    // 顶级旗舰模型做视觉，狠狠扣 5 分！
    if (name.includes('pro') || name.includes('sonnet')) return 5;
    // 中端模型做视觉，扣 3 分
    return 3; 
  }

  // ==========================================
  // 📝 文本任务 (魔法扩写 / 聚合搜索)
  // ==========================================
  
  // 🟢 1. 免费/引流级 (自有 Key，成本极低) -> 扣 1 分
  if (name.includes('flash') || name.includes('deepseek') || name.includes('doubao')) {
    return 1;
  }

  // 🟡 2. 中端进阶级 (N1N 便宜模型) -> 扣 2 分
  if (name.includes('kimi') || name.includes('mini')) {
    return 2;
  }

  // 🔴 3. 顶级旗舰级 (N1N 昂贵模型) -> 扣 5 分
  if (name.includes('pro') || name.includes('sonnet') || name.includes('opus')) {
    return 5;
  }

  // 🛡️ 兜底防护：如果前端传了一个不认识的模型，为了防止亏钱，默认扣 3 分
  return 3;
}