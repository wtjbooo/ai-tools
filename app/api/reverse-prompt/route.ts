import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// 🛡️ 整合了官方直连与中转的三轨道密钥
const KEYS = {
  geminiOfficial: process.env.GEMINI_API_KEY,      // 轨道 A：你的谷歌官方 Key
  geminiN1N: process.env.GEMINI_GROUP_KEY,         // 轨道 B1：N1N Gemini 组
  openai: process.env.OPENAI_GROUP_KEY,            // 轨道 B2：N1N OpenAI 组
  claude: process.env.CLAUDE_GROUP_KEY,            // 轨道 B3：N1N Claude 组
};

const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";
// 🚀 谷歌官方最新推出的 OpenAI 兼容接口地址！
const GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

function translateError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded")) return "😴 服务器当前排队人数过多被挤爆了，请稍后重试。";
  if (msg.includes("401") || msg.includes("api_key_invalid")) return "🔑 API 密钥无效或配置错误。";
  if (msg.includes("insufficient quota")) return "💰 账户余额或配额不足。";
  if (msg.includes("not found")) return "🔍 模型名称不匹配，请检查配置。";
  return `⚠️ 解析失败: ${errorMsg}`;
}

function safeParseJSON(text: string) {
  try { return JSON.parse(text); } 
  catch (e) {
    const ticks = String.fromCharCode(96, 96, 96);
    const regex = new RegExp(ticks + "(?:json)?\\n([\\s\\S]*?)\\n" + ticks);
    const match = text.match(regex);
    if (match && match[1]) {
      try { return JSON.parse(match[1]); } catch (err) { throw new Error("JSON 内部格式错误"); }
    }
    throw new Error("无法从模型输出提取有效 JSON");
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const analyzerModel = formData.get("analyzerModel") as string;
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) return NextResponse.json({ error: "未接收到文件" }, { status: 400 });

    // 🚀 【核心逻辑】智能选择 API Key 和 Base URL
    let selectedKey = KEYS.openai;
    let baseUrl = N1N_BASE_URL;
    let targetModel = analyzerModel;

    if (analyzerModel === 'gemini-free') {
      // 🌟 命中免费版：走谷歌官方直连通道！
      selectedKey = KEYS.geminiOfficial;
      baseUrl = GOOGLE_BASE_URL;
      targetModel = 'gemini-1.5-flash'; 
    } else if (analyzerModel.includes("gemini")) {
      // 命中付费版：走 N1N 中转通道
      selectedKey = KEYS.geminiN1N;
    } else if (analyzerModel.includes("claude")) {
      selectedKey = KEYS.claude;
    }

    if (!selectedKey) {
      return NextResponse.json({ error: `服务端未配置该模型所属的 API Key` }, { status: 500 });
    }

    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const systemPrompt = `你是一个多模态视觉反推专家。请直接输出纯 JSON 数据，严禁使用 Markdown 包裹！必须遵循结构：{ "summary": [...], "prompts": { "standard": {"zh": "...", "en": "..."} }, "negativePrompt": {"zh": "...", "en": "..."} }`;

    const payload = {
      model: targetModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt },
            { type: "image_url", image_url: { url: `data:${file.type};base64,${base64Data}` } }
          ]
        }
      ],
      temperature: 0.6,
      stream: false 
    };

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${selectedKey}`
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try { errMsg = JSON.parse(responseText).error?.message || errMsg; } catch (e) {} 
      throw new Error(errMsg);
    }

    const payloadData = JSON.parse(responseText);
    const content = payloadData.choices[0].message.content;
    return NextResponse.json(safeParseJSON(content));

  } catch (error: any) {
    console.error("图片反推解析失败:", error);
    return NextResponse.json({ error: translateError(error.message) }, { status: 500 });
  }
}