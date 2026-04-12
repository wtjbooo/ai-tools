import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// 🛡️ 统归 N1N 中转调度，最稳妥的方案（彻底解决谷歌官方接口 404 的问题）
const KEYS = {
  gemini: process.env.GEMINI_GROUP_KEY,   // N1N Gemini 组
  openai: process.env.OPENAI_GROUP_KEY,   // N1N OpenAI 组
  claude: process.env.CLAUDE_GROUP_KEY,   // N1N Claude 组
};

const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";

function translateError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded")) return "😴 服务器当前排队人数过多被挤爆了，请稍后重试。";
  if (msg.includes("401") || msg.includes("api_key_invalid")) return "🔑 API 密钥无效或配置错误。";
  if (msg.includes("insufficient quota")) return "💰 账户余额或配额不足。";
  if (msg.includes("not found")) return "🔍 模型名称不匹配，请检查配置。";
  return `⚠️ 解析失败: ${errorMsg}`;
}

// 🛡️ 究极防弹 JSON 提取器（无视大模型任何废话，彻底解决 GPT 提取报错）
function safeParseJSON(text: string) {
  try { 
    return JSON.parse(text); 
  } catch (e) {
    // 暴力提取：寻找第一个 { 和最后一个 }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr);
      } catch (err) {
        throw new Error("JSON 截取后格式仍有误");
      }
    }
    // 如果实在提不出来，把模型到底回复了啥抛给前端看
    throw new Error("未找到 JSON 结构，模型回复：" + text.slice(0, 30) + "...");
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const analyzerModel = formData.get("analyzerModel") as string;
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) return NextResponse.json({ error: "未接收到文件" }, { status: 400 });

    // 🚀 智能路由分配
    let selectedKey = KEYS.openai;
    let targetModel = analyzerModel;

    // 所有 Gemini 全部走 N1N 的 Gemini 分组
    if (analyzerModel.includes("gemini")) {
      selectedKey = KEYS.gemini;
      // ✨ 这里已经为你完美替换为最新的 2.5 版本！
      targetModel = analyzerModel === 'gemini-free' ? 'gemini-2.5-flash' : analyzerModel;
    } else if (analyzerModel.includes("claude")) {
      selectedKey = KEYS.claude;
    }

    if (!selectedKey) {
      return NextResponse.json({ error: `服务端未配置该模型所属的 API Key` }, { status: 500 });
    }

    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const systemPrompt = `你是一个多模态视觉反推专家。请深度解析画面。必须且只能输出纯 JSON 数据。严禁任何前言、后语或 Markdown 标记。严格遵循结构：{ "summary": [{"label":"主体","value":"..."}], "cinematography": [{"label":"运镜","value":"..."}], "prompts": { "simple": {"zh": "...","en": "..."}, "standard": {"zh": "...","en": "..."}, "pro": {"zh": "...","en": "..."} }, "negativePrompt": {"zh": "...","en": "..."}, "platformVariants": {"generic": {"zh": "...","en": "..."}}, "disclaimer": "仅供参考" }`;

    const payload: any = {
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

    // ✨ 核心修复：强制给 GPT 套上 JSON 枷锁，禁止它说废话
    if (targetModel.includes("gpt")) {
      payload.response_format = { type: "json_object" };
    }

    const response = await fetch(`${N1N_BASE_URL}/chat/completions`, {
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
    
    // 调用究极提取器
    const finalJSON = safeParseJSON(content);
    return NextResponse.json(finalJSON);

  } catch (error: any) {
    console.error("图片反推解析失败:", error);
    return NextResponse.json({ error: translateError(error.message) }, { status: 500 });
  }
}