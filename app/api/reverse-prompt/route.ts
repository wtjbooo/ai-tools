import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 🚀 引入我们强大的全局包装器和限流器
import { withProtection } from "@/lib/api-wrapper";
import { analyzeRateLimit } from "@/lib/ratelimit";

export const maxDuration = 60;

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true, 
});

const KEYS = {
  gemini: process.env.GEMINI_GROUP_KEY,   
  openai: process.env.OPENAI_GROUP_KEY,   
  claude: process.env.CLAUDE_GROUP_KEY,   
};

const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";

function translateError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded")) return "😴 服务器当前排队人数过多被挤爆了，请稍后重试。";
  if (msg.includes("401") || msg.includes("api_key_invalid")) return "🔑 API 密钥无效或配置错误。";
  if (msg.includes("insufficient quota")) return "💰 账户余额或配额不足。";
  if (msg.includes("not found")) return "🔍 模型名称不匹配，请检查配置。";
  return `⚠️ AI 引擎处理异常: ${errorMsg}`;
}

function safeParseJSON(text: string) {
  try { 
    return JSON.parse(text); 
  } catch (e) {
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
    throw new Error("未找到 JSON 结构，模型回复：" + text.slice(0, 30) + "...");
  }
}

// ==========================================
// 🚨 核心业务逻辑处理器（不包含任何鉴权和扣费代码）
// ==========================================
async function reversePromptHandler(req: NextRequest, context: { userId: string; remainingQuota?: number }) {
  try {
    const body = await req.json();
    const { 
      analyzerModel, 
      targetPlatform = "generic", 
      inputType, 
      fileKeys 
    } = body;
    
    // 💡 注意：这里全部改成了 throw new Error()
    // 因为抛出错误后，外层的 API Wrapper 会捕捉到，并自动退回已经扣除的次数！
    if (!fileKeys || !Array.isArray(fileKeys) || fileKeys.length === 0) {
        throw new Error("未接收到云端素材");
    }

    if (inputType === "video" && analyzerModel !== "gemini-3.1-pro-preview") {
      throw new Error("⚠️ 视频反推需要极高算力，当前选择的 Claude / 免费模型仅支持图片。\n\n👉 解决方案：请在左侧切换为【Gemini 3.1 Pro】多模态霸主模型，它是目前唯一能完美解析动态视频与运镜的引擎！");
    }

    let selectedKey = KEYS.openai;
    let targetModel = analyzerModel;
    let apiUrl = `${N1N_BASE_URL}/chat/completions`; 

    if (analyzerModel === 'gemini-free') {
      selectedKey = process.env.GEMINI_API_KEY; 
      apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      targetModel = 'gemini-1.5-flash';
    } else if (analyzerModel.includes("gemini")) {
      selectedKey = KEYS.gemini;
      targetModel = analyzerModel; 
    } else if (analyzerModel.includes("claude")) {
      selectedKey = KEYS.claude;
    }

    if (!selectedKey) {
      throw new Error(`服务端未配置该模型所属的 API Key`);
    }

    const fileKey = fileKeys[0];
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    });
    
    const fileUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 600 });

    let finalImageUrl = fileUrl;
    if (apiUrl.includes("googleapis.com")) {
      try {
        const imgRes = await fetch(fileUrl);
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64String = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
        finalImageUrl = `data:${mimeType};base64,${base64String}`;
      } catch (err) {
        throw new Error("云端素材读取失败，请重试！");
      }
    }

    const systemPrompt = `你是一个世界顶级的多模态视觉解析专家与 AI 提示词（Prompt）工程师。
请仔细分析提供的视觉素材。

【动态与视频专属解析规则（极度重要）】
如果检测到素材包含动态变化（或输入类型为 ${inputType}），你必须极其详细地提取以下维度：
1. 镜头语言 (Camera Language)：是固定机位、推镜头(Zoom in)、拉镜头(Zoom out)、平移(Pan)、还是手持晃动感(Handheld)？
2. 动作序列 (Action Sequence)：主体在时间线内发生了什么具体动作？
3. 物理与环境变化 (Dynamics)：光影的流转、天气变化、背景物体的运动等。

最终生成的各个版本的提示词，绝对不能是简单的短句。必须是一段包含主体、环境、光影、材质、风格、镜头（或动作）的高质量长段落（至少 50 个字以上）。

必须且只能输出纯 JSON 数据。严禁任何前言、后语或 Markdown 标记。严格遵循以下结构：
{
  "summary": [{"label":"主体与动作","value":"..."}],
  "cinematography": [{"label":"运镜与光影","value":"..."}],
  "prompts": {
    "simple": {"zh": "...","en": "..."},
    "standard": {"zh": "...","en": "..."},
    "pro": {"zh": "...","en": "..."}
  },
  "negativePrompt": {"zh": "...","en": "..."},
  "platformVariants": {
    "${targetPlatform}": {"zh": "...","en": "..."}
  },
  "disclaimer": "深度结构化解析完毕，已适配对应平台。"
}`;

    const payload: any = {
      model: targetModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt },
            { type: "image_url", image_url: { url: finalImageUrl } } 
          ]
        }
      ],
      temperature: 0.6,
      stream: false 
    };

    if (targetModel.includes("gpt")) {
      payload.response_format = { type: "json_object" };
    }

    const response = await fetch(apiUrl, {
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
    
    const finalJSON = safeParseJSON(content);
    
    // 从 context 中获取刚扣除后剩余的次数返回给前端
    finalJSON._remainingQuota = context.remainingQuota; 

    return NextResponse.json(finalJSON);

  } catch (error: any) {
    // 拦截任何异常，翻译成中文，然后抛出去给 Wrapper 触发退钱！
    console.error("素材反推业务逻辑异常，抛出给包装器执行回滚:", error);
    throw new Error(translateError(error.message));
  }
}

// ==========================================
// 🚀 对外导出 API，套上终极护盾！
// ==========================================
export const POST = withProtection(reversePromptHandler, {
  rateLimiter: analyzeRateLimit, // 开启防刷限流
  deductQuota: true              // 开启商业化扣费（且支持报错自动回滚退费！）
});