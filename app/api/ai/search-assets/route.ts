import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSearchSystemPrompt } from "@/app/config/prompts";
import { withProtection } from "@/lib/api-wrapper";
import { searchRateLimit } from "@/lib/ratelimit";

// 💡 1. 像魔法扩写一样，把所有的 Key 都在顶部声明好
const N1N_API_KEY = process.env.N1N_API_KEY;
const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/chat/completions";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

function safeParseJSON(text: string) {
  try { return JSON.parse(text); } 
  catch (e) {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) {
      try { return JSON.parse(match[1]); } catch (err) { throw new Error("JSON 解析失败"); }
    }
    throw new Error("无法从模型输出提取有效 JSON");
  }
}

function translateError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded") || msg.includes("bad gateway")) {
    return "😴 服务器当前节点拥堵，请更换其他模型或稍后重试。";
  }
  if (msg.includes("invalid token") || msg.includes("401")) {
    return "🔑 API 密钥无效！请检查服务端的环境变量配置。";
  }
  if (msg.includes("insufficient quota") || msg.includes("balance")) {
    return "💰 该模型渠道的账号余额不足。";
  }
  return `⚠️ 搜索规划失败: ${errorMsg}`; 
}

export const POST = withProtection(
  async (req: NextRequest, { userId, remainingQuota }) => {
    try {
      const { query, mode, targetModel = "gemini-free" } = await req.json();
      const systemPrompt = getSearchSystemPrompt(query, mode, targetModel);
      let data;

      // 🚦 轨道一：Gemini
      if (targetModel === "gemini-free") {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }, 
        });
        data = safeParseJSON(result.response.text());
      } 
      // 🚦 轨道二：DeepSeek 原生直连 (这正是 enhance-prompt 能跑通的核心秘诀！)
      else if (targetModel === "deepseek-chat") {
        if (!DEEPSEEK_API_KEY) throw new Error("未配置 DEEPSEEK_API_KEY");
        const response = await fetch(DEEPSEEK_BASE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "system", content: systemPrompt }],
            temperature: 0.8,
            stream: false,
            response_format: { type: "json_object" }
          }),
        });
        const responseText = await response.text(); 
        if (!response.ok) throw new Error(`DeepSeek 失败: ${responseText.slice(0, 50)}`);
        data = safeParseJSON(JSON.parse(responseText).choices[0].message.content);
      } 
      // 🚦 轨道三：N1N 中转平台 (用于 Claude, GPT, Kimi 等)
      else {
        if (!N1N_API_KEY) throw new Error("服务端未配置高级模型 N1N API Key");
        
        const requestPayload: any = {
          model: targetModel,
          messages: [{ role: "user", content: systemPrompt }],
          temperature: 0.7, 
          stream: false, 
        };

        if (targetModel.includes("gpt")) {
           requestPayload.response_format = { type: "json_object" };
        }

        const response = await fetch(`${N1N_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${N1N_API_KEY}` },
          body: JSON.stringify(requestPayload),
        });

        const responseText = await response.text();
        if (!response.ok) {
          try {
            const errObj = JSON.parse(responseText);
            throw new Error(errObj.error?.message || `请求失败 (${response.status})`);
          } catch(e) {
            throw new Error(`HTTP ${response.status} - ${responseText.slice(0, 50)}...`);
          }
        }
        data = safeParseJSON(JSON.parse(responseText).choices[0].message.content);
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