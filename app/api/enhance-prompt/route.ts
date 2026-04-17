import { NextRequest, NextResponse } from "next/server";
import { getEnhanceSystemPrompt } from "@/app/config/prompts";
import { fetch as undiciFetch, ProxyAgent } from 'undici'; 

// 🛡️ 引入万能安全包装器和我们刚写的扩写限流器
import { withProtection } from "@/lib/api-wrapper";
import { enhanceRateLimit } from "@/lib/ratelimit";

const N1N_API_KEY = process.env.N1N_API_KEY;
const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/chat/completions";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
    return "😴 N1N 中转服务器当前节点拥堵，请更换其他模型或稍后重试。";
  }
  if (msg.includes("invalid token") || msg.includes("401")) {
    return "🔑 API 密钥无效！请检查服务端的环境变量配置。";
  }
  if (msg.includes("insufficient quota") || msg.includes("balance")) {
    return "💰 该模型渠道的账号余额不足。";
  }
  if (msg.includes("timeout") || msg.includes("fetch failed") || msg.includes("terminated")) {
    return "🌐 网络请求被拦截，请检查代理是否通畅。";
  }
  return `⚠️ 扩写失败: ${errorMsg}`; 
}

// ==========================================
// 🚀 使用 withProtection 万能包装器！
// 登录、限流、扣除额度... 都在外壳自动完成了
// ==========================================
export const POST = withProtection(
  async (req: NextRequest, { userId, remainingQuota }) => {
    try {
      const { text, style, targetModel = "gemini-free", targetPlatform } = await req.json();

      if (!text || text.trim() === "") {
        return NextResponse.json({ error: "请输入您的初步想法" }, { status: 400 });
      }

      const systemPrompt = getEnhanceSystemPrompt(text, style, targetPlatform, targetModel);
      let data;

      // 🚦 轨道一：Gemini (走专属地下隧道)
      if (targetModel === "gemini-free") {
        if (!GEMINI_API_KEY) throw new Error("未配置 GEMINI_API_KEY");
        
        const proxyAgent = process.env.NODE_ENV === 'development' 
          ? new ProxyAgent('http://127.0.0.1:7890') 
          : undefined;

        const response = await undiciFetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            }),
            dispatcher: proxyAgent 
          }
        ) as any;

        const responseText = await response.text();
        if (!response.ok) throw new Error(`Gemini 请求失败: ${responseText.slice(0, 50)}`);
        const payload = JSON.parse(responseText);
        data = safeParseJSON(payload.candidates[0].content.parts[0].text);
        
      } 
      // 🚦 轨道二：DeepSeek (走原生直连)
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
      // 🚦 轨道三：N1N 中转平台 (走原生，修复格式)
      else {
        if (!N1N_API_KEY) throw new Error("未配置 N1N API Key");
        
        const requestPayload: any = {
          model: targetModel,
          messages: [{ role: "user", content: systemPrompt }],
          temperature: 0.8, 
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

      // 💡 魔法点睛：把刚刚通过 withProtection 扣减完的剩余额度，塞进 data 里返回给前端！
      data._remainingQuota = remainingQuota;
      return NextResponse.json(data);
      
    } catch (error: any) {
      console.error(`AI 扩写失败:`, error.message);
      const friendlyError = translateError(error.message);
      return NextResponse.json({ error: friendlyError }, { status: 500 });
    }
  },
  // ⚙️ 万能包装器的配置项：
  {
    rateLimiter: enhanceRateLimit, // 启用防刷限流
    cost: 1                        // 👈 完美修复：改为 cost 扣除积分！
  }
);