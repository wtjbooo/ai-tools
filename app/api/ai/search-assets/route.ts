import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
// 🚀 1. 引入我们刚才创建的提示词配置函数
import { getSearchSystemPrompt } from "@/app/config/prompts";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const N1N_API_KEY = process.env.N1N_API_KEY;
const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";

// 🇨🇳 专属的中文报错翻译拦截器
function translateError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded")) {
    return "😴 官方服务器当前排队人数过多被挤爆了，请稍后重试，或切换使用其他高级模型。";
  }
  if (msg.includes("invalid token") || msg.includes("401")) {
    return "🔑 API 密钥 (Token) 无效或填错啦！请检查服务端的环境变量配置。";
  }
  if (msg.includes("insufficient quota") || msg.includes("balance")) {
    return "💰 该模型渠道的账号余额不足，请检查大模型平台的充值状态。";
  }
  if (msg.includes("not found") || msg.includes("does not exist")) {
    return "🔍 找不到该模型，请检查模型名称 (ID) 是否填写正确。";
  }
  if (msg.includes("timeout") || msg.includes("fetch failed")) {
    return "🌐 网络请求超时或失败，请检查服务器的网络连通性。";
  }
  return `⚠️ 搜索失败: ${errorMsg}`;
}

// 🪄 工具函数：安全地解析大模型返回的 JSON，去除多余的 Markdown 标记
function safeParseJSON(text: string) {
  try {
    // 尝试直接解析
    return JSON.parse(text);
  } catch (e) {
    // 如果失败，尝试通过正则表达式剥离 ```json 和 ``` 标记
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (innerError) {
        throw new Error("模型返回的数据即使去除了 Markdown 也无法解析为 JSON");
      }
    }
    throw new Error("无法从模型输出中提取有效的 JSON 格式");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query, mode, targetModel = "gemini-free" } = await req.json();

    // 🚀 2. 动态获取专属提示词，替换掉原来的硬编码字符串
    const systemPrompt = getSearchSystemPrompt(query, mode, targetModel);

    let data;

    // 🚦 双轨道智能分流网关
    if (targetModel === "gemini-free") {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }, 
      });
      data = safeParseJSON(result.response.text());
    } else {
      if (!N1N_API_KEY) throw new Error("服务端未配置高级模型 API Key");
      
      const response = await fetch(`${N1N_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${N1N_API_KEY}`
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.7,
          // 注意：有些模型不支持 response_format，我们已经在 Prompt 中强调了纯 JSON，加上 safeParseJSON 双保险
          response_format: { type: "json_object" } 
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `请求 ${targetModel} 失败`);
      }
      
      const payload = await response.json();
      const content = payload.choices[0].message.content;
      data = safeParseJSON(content); // 使用安全解析工具
    }

    // 组装最终的真实 URL 链接
    const enrichedData = data.items.map((item: any) => {
      const keyword = encodeURIComponent(item.searchQuery);
      let realUrl = "";
      switch (item.platform) {
        case "抖音": realUrl = `https://www.douyin.com/search/${keyword}`; break;
        case "小红书": realUrl = `https://www.xiaohongshu.com/search_result?keyword=${keyword}`; break;
        case "快手": realUrl = `https://www.kuaishou.com/search/video?searchKey=${keyword}`; break;
        case "B站": realUrl = `https://search.bilibili.com/all?keyword=${keyword}`; break;
        case "微博": realUrl = `https://s.weibo.com/weibo?q=${keyword}`; break;
        case "知乎": realUrl = `https://www.zhihu.com/search?q=${keyword}`; break;
        default: realUrl = `https://www.google.com/search?q=${keyword}`;
      }
      return { ...item, url: realUrl };
    });

    return NextResponse.json({ success: true, data: enrichedData });
    
  } catch (error: any) {
    console.error(`AI 搜索失败 [${req.method}]:`, error.message);
    // 🚀 在这里拦截并翻译！
    const friendlyError = translateError(error.message || "聚合搜索失败");
    return NextResponse.json({ error: friendlyError }, { status: 500 });
  }
}