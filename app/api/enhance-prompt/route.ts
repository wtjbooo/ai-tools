import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
// 注意：这里导入的是扩写的 Prompt 和 限流器
import { getEnhanceSystemPrompt } from "@/app/config/prompts"; 
import { withProtection } from "@/lib/api-wrapper";
import { enhanceRateLimit } from "@/lib/ratelimit"; 
import { getModelCost } from "@/lib/pricing";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY; 

// 🚀 核心修复：读取你 .env 里的分组 Key
const KEYS = {
  gemini: process.env.GEMINI_GROUP_KEY,   
  openai: process.env.OPENAI_GROUP_KEY,   
  claude: process.env.CLAUDE_GROUP_KEY,   
};

// 💡 终极汉化报错拦截
function translateError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes("api key") || msg.includes("未配置")) return "🔑 服务器密钥缺失：请检查环境变量的分组 Key 是否正确。";
  if (msg.includes("not found") && msg.includes("gemini")) return "🛰️ 模型失效：接口已更新，请换个模型试试。";
  if (msg.includes("401") || msg.includes("invalid")) return "🚫 访问被拒绝：API Key 已失效或额度已耗尽。";
  if (msg.includes("503") || msg.includes("overloaded")) return "⏳ 服务器太火爆了：AI 正在排队，请稍后再试。";
  if (msg.includes("failed to fetch") || msg.includes("timeout")) return "📡 网络连接超时：大模型思考太久了（建议更换出字快的模型，如 Gemini Flash 或 GPT-4o-mini）。";
  return `❌ 扩写失败：${errorMsg}`;
}

function safeParseJSON(text: string) {
  try { return JSON.parse(text); } 
  catch (e) {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) {
      try { return JSON.parse(match[1]); } catch (e) { throw new Error("无法解析清洗后的 JSON"); }
    }
    throw new Error("无法从模型输出中提取有效的 JSON 格式");
  }
}

export const POST = withProtection(
  async (req: NextRequest, { userId, remainingQuota }) => {
    try {
      const { query, mode, targetModel = "gemini-free", targetPlatform = "generic" } = await req.json();
      const systemPrompt = getEnhanceSystemPrompt(query, mode, targetModel, targetPlatform);

      let data;

      // 🚦 轨道一：Gemini 免费版走官方直连通道
      if (targetModel === "gemini-free") {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }, 
        });
        data = safeParseJSON(result.response.text());
      } 
      // 🚦 轨道二：DeepSeek 原生直连通道
      else if (targetModel.includes("deepseek")) {
        if (!DEEPSEEK_API_KEY) throw new Error("服务端未配置 DEEPSEEK_API_KEY");
        const response = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
          body: JSON.stringify({
            model: targetModel,
            messages: [
              { role: "system", content: "你是一个只能输出 JSON 的 AI 助手。" },
              { role: "user", content: systemPrompt }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" } 
          }),
        });

        if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || `请求 DeepSeek 失败`); }
        const payload = await response.json();
        data = safeParseJSON(payload.choices[0].message.content);
      } 
      // 🚦 轨道三：高级模型全部走 N1N 中转通道 (智能匹配对应的 Key)
      else {
        let selectedKey = KEYS.openai; // 默认给 OpenAI
        let actualModel = targetModel;

        if (targetModel.includes("gemini")) { selectedKey = KEYS.gemini; actualModel = "gemini-1.5-pro"; } // 修复 Pro 版调用
        else if (targetModel.includes("claude")) selectedKey = KEYS.claude;

        if (!selectedKey) throw new Error(`该模型对应的 API Key 分组尚未配置`);

        const response = await fetch(`${N1N_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${selectedKey}` },
          body: JSON.stringify({
            model: actualModel,
            messages: [{ role: "user", content: systemPrompt }],
            temperature: 0.7,
            response_format: actualModel.includes("gpt") || actualModel.includes("gemini") ? { type: "json_object" } : undefined 
          }),
        });

        if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || `请求 ${actualModel} 失败`); }
        const payload = await response.json();
        data = safeParseJSON(payload.choices[0].message.content); 
      }

      return NextResponse.json({ 
        success: true, 
        data: data,
        _remainingQuota: remainingQuota 
      });
      
    } catch (error: any) {
      console.error("扩写接口调用失败:", error);
      throw new Error(translateError(error.message));
    }
}, { rateLimiter: enhanceRateLimit, taskType: 'text' });