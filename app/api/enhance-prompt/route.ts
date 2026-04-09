import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
// 🚀 引入集中管理的提示词函数
import { getEnhanceSystemPrompt } from "@/app/config/prompts";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const N1N_API_KEY = process.env.N1N_API_KEY;
const N1N_BASE_URL = process.env.N1N_BASE_URL || "[https://api.n1n.ai/v1](https://api.n1n.ai/v1)";

// 🛡️ 极其重要的容错函数
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

export async function POST(req: NextRequest) {
  try {
    const { text, style, targetModel = "gemini-free", targetPlatform } = await req.json();

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "请输入您的初步想法" }, { status: 400 });
    }

    // 🚀 动态获取提示词
    const systemPrompt = getEnhanceSystemPrompt(text, style, targetPlatform, targetModel);
    let data;

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

    return NextResponse.json(data); // 注意：这里直接返回 data，匹配你前端的 setResult(data)
    
  } catch (error: any) {
    console.error(`AI 扩写失败:`, error.message);
    return NextResponse.json({ error: error.message || "扩写生成失败" }, { status: 500 });
  }
}