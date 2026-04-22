import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSearchSystemPrompt } from "@/app/config/prompts";
import { withProtection } from "@/lib/api-wrapper";
import { searchRateLimit } from "@/lib/ratelimit";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const N1N_API_KEY = process.env.N1N_API_KEY;
const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";
// 🚀 新增：DeepSeek 专属直连环境变量
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY; 

function translateError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes("503") || msg.includes("overloaded")) return "😴 官方服务器当前排队人数过多被挤爆了，请稍后重试。";
  if (msg.includes("invalid token") || msg.includes("401")) return "🔑 API 密钥无效！请检查服务端的环境变量配置。";
  if (msg.includes("insufficient quota")) return "💰 该模型渠道的账号余额不足。";
  if (msg.includes("not found")) return "🔍 找不到该模型，请检查模型 ID。";
  return `⚠️ 搜索失败: ${errorMsg}`;
}

function safeParseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
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
      const { query, mode, targetModel = "gemini-free" } = await req.json();
      const systemPrompt = getSearchSystemPrompt(query, mode, targetModel);

      let data;

      // 🚦 轨道一：Gemini 官方通道
      if (targetModel === "gemini-free" || targetModel === "gemini-3.1-pro-preview") {
        const modelName = targetModel === "gemini-free" ? "gemini-2.5-flash" : "gemini-1.5-pro"; // 确保调用正确的真实模型名
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }, 
        });
        data = safeParseJSON(result.response.text());
      } 
      // 🚦 轨道二：DeepSeek 原生直连通道
      else if (targetModel === "deepseek-chat") {
        if (!DEEPSEEK_API_KEY) throw new Error("服务端未配置 DEEPSEEK_API_KEY");
        const response = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: "你是一个只能输出 JSON 的 AI 助手。" },
              { role: "user", content: systemPrompt }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" } // DeepSeek 强制 JSON 输出
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || `请求 DeepSeek 失败`);
        }
        const payload = await response.json();
        data = safeParseJSON(payload.choices[0].message.content);
      } 
      // 🚦 轨道三：N1N 中转通道 (Claude, GPT 等)
      else {
        if (!N1N_API_KEY) throw new Error("服务端未配置 N1N_API_KEY");
        const response = await fetch(`${N1N_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${N1N_API_KEY}`
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: "user", content: systemPrompt }],
            temperature: 0.7,
            response_format: { type: "json_object" } 
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || `请求 ${targetModel} 失败`);
        }
        const payload = await response.json();
        data = safeParseJSON(payload.choices[0].message.content); 
      }

      // 组装最终链接
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

      // 💡 封装返回数据，将 items 和 analysis 一起传给前端
      return NextResponse.json({ 
        success: true, 
        data: {
          analysis: data.summary || data.analysis || "AI 思考完成，正在为您生成矩阵...",
          items: enrichedData
        },
        _remainingQuota: remainingQuota 
      });
      
    } catch (error: any) {
      console.error(`AI 搜索失败:`, error.message);
      return NextResponse.json({ error: translateError(error.message) }, { status: 500 });
    }
  },
  { rateLimiter: searchRateLimit, taskType: 'text' }
);