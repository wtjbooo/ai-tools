import { NextRequest } from "next/server";

// 🚀 终极杀招：放弃经常死锁的 Edge，改用极度稳定的 Node 环境，并向 Vercel 申请 60 秒特权时长！
export const maxDuration = 60; 

const N1N_API_KEY = process.env.N1N_API_KEY;
const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";

// ... 下面的代码完全保持不变 ...

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
  return `⚠️ 解析失败: ${errorMsg}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const analyzerModel = formData.get("analyzerModel") as string;
    const files = formData.getAll("files") as File[];
    
    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: "未接收到文件" }), { status: 400 });
    }

    if (!N1N_API_KEY) {
      return new Response(JSON.stringify({ error: "服务端未配置高级模型 API Key" }), { status: 500 });
    }

    // 🚀 核心魔法 2：光速 Base64 转换引擎
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type;

    const systemPrompt = `你是一个世界级的多模态视觉反推专家。请深度解析用户上传的画面。
必须直接输出纯 JSON 数据，绝对不要使用 \`\`\`json 等 Markdown 包裹！必须严格遵循以下结构：
{
  "summary": [{"label": "画面主体", "value": "描述..."}, {"label": "环境氛围", "value": "描述..."}],
  "cinematography": [{"label": "镜头语言", "value": "描述..."}, {"label": "光影色彩", "value": "描述..."}],
  "prompts": {
    "simple": {"zh": "中文极简词", "en": "English simple prompt"},
    "standard": {"zh": "中文标准词", "en": "English standard prompt"},
    "pro": {"zh": "中文专业词", "en": "English pro prompt"}
  },
  "negativePrompt": {"zh": "负面词", "en": "Negative tags"},
  "platformVariants": {
    "generic": {"zh": "...", "en": "..."},
    "midjourney": {"zh": "...", "en": "..."},
    "sora": {"zh": "...", "en": "..."}
  },
  "disclaimer": "AI 解析结果仅供参考"
}`;

    const payload = {
      model: analyzerModel === 'gemini-free' ? 'gemini-3.1-pro-preview' : analyzerModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt },
            { 
              type: "image_url", 
              image_url: { url: `data:${mimeType};base64,${base64Data}` } 
            }
          ]
        }
      ],
      temperature: 0.6,
      max_tokens: 4000, // 🚀 关键修复：专治 Claude 模型不带此参数就卡死的潜规则！
      stream: true 
    };

    const response = await fetch(`${N1N_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${N1N_API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json();
      const friendlyError = translateError(err.error?.message || "大模型请求失败");
      return new Response(JSON.stringify({ error: friendlyError }), { status: 500 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("解析失败:", error);
    const friendlyError = translateError(error.message || "文件解析失败");
    return new Response(JSON.stringify({ error: friendlyError }), { status: 500 });
  }
}