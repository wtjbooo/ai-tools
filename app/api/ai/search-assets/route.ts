import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSearchSystemPrompt } from "@/app/config/prompts";
import { withProtection } from "@/lib/api-wrapper";
import { searchRateLimit } from "@/lib/ratelimit";
import { getModelCost } from "@/lib/pricing";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY; 

const KEYS = {
  gemini: process.env.GEMINI_GROUP_KEY,   
  openai: process.env.OPENAI_GROUP_KEY,   
  claude: process.env.CLAUDE_GROUP_KEY,   
};

function translateError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes("api key") || msg.includes("未配置")) return "🔑 服务器密钥缺失：请检查环境变量的分组 Key 是否正确。";
  if (msg.includes("not found") && msg.includes("gemini")) return "🛰️ 模型失效：接口版本已更新，请尝试更换模型。";
  if (msg.includes("无可用渠道") || msg.includes("no available channel")) return "🔀 中转渠道异常：该模型当前无可用节点，请切换其他模型。";
  if (msg.includes("401") || msg.includes("invalid")) return "🚫 访问被拒绝：API Key 已失效或额度已耗尽。";
  if (msg.includes("503") || msg.includes("overloaded")) return "⏳ 服务器太火爆了：AI 正在排队，请稍后再试。";
  if (msg.includes("failed to fetch") || msg.includes("timeout")) return "📡 网络连接超时：大模型思考太久了。";
  return `❌ 搜索分析失败：${errorMsg}`;
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
      const body = await req.json();
      const { query, mode, targetModel = "gemini-free" } = body;
      
      const userInput = query || body.prompt || body.keyword || body.text || "";
      if (!userInput.trim()) throw new Error("接收到的输入为空，请检查网络或刷新页面重试。");

      const systemPrompt = getSearchSystemPrompt(userInput, mode, targetModel);
      const finalPrompt = `${systemPrompt}\n\n====================\n【系统最高指令】：请严格按照上述要求，对以下关键词进行搜索策略扩展！\n【用户真实搜索词】：${userInput}`;

      let data;

      // 🚦 轨道一：仅仅只有 gemini-free 走官方白嫖通道！
      if (targetModel === "gemini-free") {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); 
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
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
              { role: "user", content: finalPrompt }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" } 
          }),
        });

        if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || `请求 DeepSeek 失败`); }
        const payload = await response.json();
        data = safeParseJSON(payload.choices[0].message.content);
      } 
      // 🚦 轨道三：其他所有高级模型 (包含 Gemini Pro) 统一走 N1N 中转付费通道！
      else {
        let selectedKey = KEYS.openai; 
        let actualModel = targetModel;

        if (targetModel.includes("gemini")) { 
          selectedKey = KEYS.gemini; 
          actualModel = "gemini-1.5-pro"; // N1N 渠道里识别的规范名字
        } else if (targetModel.includes("claude")) {
          selectedKey = KEYS.claude;
        }

        if (!selectedKey) throw new Error(`该模型对应的 API Key 分组尚未配置`);

        const response = await fetch(`${N1N_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${selectedKey}` },
          body: JSON.stringify({
            model: actualModel,
            messages: [{ role: "user", content: finalPrompt }],
            temperature: 0.7,
            response_format: actualModel.includes("gpt") || actualModel.includes("gemini") ? { type: "json_object" } : undefined 
          }),
        });

        if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || `请求 ${actualModel} 失败`); }
        const payload = await response.json();
        data = safeParseJSON(payload.choices[0].message.content); 
      }

      const enrichedData = (data.items || []).map((item: any) => {
        const keyword = encodeURIComponent(item.searchQuery);
        let realUrl = `https://www.google.com/search?q=${keyword}`;
        switch (item.platform) {
          case "抖音": realUrl = `https://www.douyin.com/search/${keyword}`; break;
          case "小红书": realUrl = `https://www.xiaohongshu.com/search_result?keyword=${keyword}`; break;
          case "快手": realUrl = `https://www.kuaishou.com/search/video?searchKey=${keyword}`; break;
          case "B站": realUrl = `https://search.bilibili.com/all?keyword=${keyword}`; break;
          case "微博": realUrl = `https://s.weibo.com/weibo?q=${keyword}`; break;
          case "知乎": realUrl = `https://www.zhihu.com/search?q=${keyword}`; break;
        }
        return { ...item, url: realUrl };
      });

      return NextResponse.json({ 
        success: true, 
        data: {
          analysis: data.summary || data.analysis || "AI 思考完成，正在为您生成矩阵...",
          items: enrichedData
        },
        _remainingQuota: remainingQuota 
      });
      
    } catch (error: any) {
      console.error("搜索接口调用失败:", error);
      throw new Error(translateError(error.message));
    }
}, { rateLimiter: searchRateLimit, taskType: 'text' });