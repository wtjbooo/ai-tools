import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnhanceSystemPrompt } from "@/app/config/prompts";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const N1N_API_KEY = process.env.N1N_API_KEY;
const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/chat/completions";

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
  return `⚠️ 扩写失败: ${errorMsg}`; // 兜底返回原错误
}

export async function POST(req: NextRequest) {
  try {
    const { text, style, targetModel = "gemini-free", targetPlatform } = await req.json();

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "请输入您的初步想法" }, { status: 400 });
    }

    const systemPrompt = getEnhanceSystemPrompt(text, style, targetPlatform, targetModel);
    let data;

    // 🚦 三轨道智能网关
    if (targetModel === "gemini-free") {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }, 
      });
      data = safeParseJSON(result.response.text());
      
    } else if (targetModel === "deepseek-chat") {
      if (!DEEPSEEK_API_KEY) throw new Error("服务端未配置 DEEPSEEK_API_KEY");
      
      const response = await fetch(DEEPSEEK_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.8,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "DeepSeek 官方请求失败");
      }
      const payload = await response.json();
      data = safeParseJSON(payload.choices[0].message.content);

    } else {
      if (!N1N_API_KEY) throw new Error("服务端未配置 N1N API Key");
      
      const response = await fetch(`${N1N_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${N1N_API_KEY}` },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.8, 
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

    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error(`AI 扩写失败:`, error.message);
    // 🇨🇳 在这里拦截并翻译错误！
    const friendlyError = translateError(error.message);
    return NextResponse.json({ error: friendlyError }, { status: 500 });
  }
}