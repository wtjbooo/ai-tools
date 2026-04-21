import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSearchSystemPrompt } from "@/app/config/prompts";
import { withProtection } from "@/lib/api-wrapper";
import { searchRateLimit } from "@/lib/ratelimit";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";

function translateError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes("503") || msg.includes("high demand")) return "😴 官方服务器当前排队人数过多被挤爆了，请稍后重试。";
  if (msg.includes("invalid token") || msg.includes("401")) return "🔑 API 密钥无效或未配置，请检查服务端环境变量。";
  if (msg.includes("insufficient quota") || msg.includes("balance")) return "💰 模型渠道账号余额不足。";
  if (msg.includes("not found")) return "🔍 找不到该模型，请检查模型 ID 是否填写正确。";
  if (msg.includes("timeout")) return "🌐 网络请求超时，请检查服务器网络连通性。";
  return `⚠️ 搜索规划失败: ${errorMsg}`;
}

function safeParseJSON(text: string) {
  try { return JSON.parse(text); } catch (e) {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) {
      try { return JSON.parse(match[1]); } catch (err) { throw new Error("去除 Markdown 后仍无法解析 JSON"); }
    }
    throw new Error("模型未返回标准 JSON 格式");
  }
}

export const POST = withProtection(
  async (req: NextRequest, { userId, remainingQuota }) => {
    try {
      const { query, mode, targetModel = "gemini-free" } = await req.json();
      
      // 💡 智能匹配 API KEY：根据前端传来的 targetModel，匹配你 .env 中的分组 Key
      let currentApiKey = "";
      if (targetModel.includes("gpt") || targetModel.includes("moonshot") || targetModel.includes("doubao")) {
        currentApiKey = process.env.OPENAI_GROUP_KEY || "";
      } else if (targetModel.includes("claude")) {
        currentApiKey = process.env.CLAUDE_GROUP_KEY || "";
      } else if (targetModel.includes("deepseek")) {
        currentApiKey = process.env.DEEPSEEK_API_KEY || "";
      } else if (targetModel.includes("gemini") && targetModel !== "gemini-free") {
        currentApiKey = process.env.GEMINI_GROUP_KEY || "";
      }

      const systemPrompt = getSearchSystemPrompt(query, mode, targetModel);
      let data;

      if (targetModel === "gemini-free") {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }, 
        });
        data = safeParseJSON(result.response.text());
      } else {
        if (!currentApiKey) throw new Error(`服务端未配置该模型(${targetModel})所属的 API Key 分组`);
        
        const response = await fetch(`${N1N_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentApiKey}`
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
        
        const content = await response.json().then(res => res.choices[0].message.content);
        data = safeParseJSON(content); 
      }

      // 组装最终的真实 URL 链接
      const enrichedItems = data.items.map((item: any) => {
        const keyword = encodeURIComponent(item.searchQuery);
        let realUrl = "";
        switch (item.platform) {
          case "抖音": realUrl = `https://www.douyin.com/search/${keyword}`; break;
          case "小红书": realUrl = `https://www.xiaohongshu.com/search_result?keyword=${keyword}`; break;
          case "快手": realUrl = `https://www.kuaishou.com/search/video?searchKey=${keyword}`; break;
          case "B站": realUrl = `https://search.bilibili.com/all?keyword=${keyword}`; break;
          case "微博": realUrl = `https://s.weibo.com/weibo?q=${keyword}`; break;
          case "知乎": realUrl = `https://www.zhihu.com/search?q=${keyword}`; break;
          case "百度": realUrl = `https://www.baidu.com/s?wd=${keyword}`; break;
          case "Google": realUrl = `https://www.google.com/search?q=${keyword}`; break;
          default: realUrl = `https://www.google.com/search?q=${keyword}`;
        }
        return { ...item, url: realUrl };
      });

      return NextResponse.json({ 
        success: true, 
        data: {
          summary: data.summary || "AI 已经为您全局规划好以下搜索矩阵方案：",
          items: enrichedItems
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