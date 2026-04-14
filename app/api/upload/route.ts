import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import prisma from "@/lib/prisma"; 
import { checkAndDeductQuota } from "@/lib/quota";
// 🔥 新增：引入我们在第三步写的分析接口限流器
import { analyzeRateLimit } from "@/lib/ratelimit";

export const maxDuration = 60;

// 1. 初始化 R2 客户端
// 🚀 2. 初始化连通 Cloudflare R2 的客户端
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true, 
  requestChecksumCalculation: "WHEN_NOT_REQUIRED",
  responseChecksumValidation: "WHEN_NOT_REQUIRED",
} as any); // 🔥 终极必杀技：加上 "as any"，告诉 TS "老子就是规矩，别管我"

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
  return `⚠️ 解析失败: ${errorMsg}`;
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

export async function POST(req: NextRequest) {
  try {
    // ==========================================
    // 💡 修复：使用正确的 Cookie 名称 session_token
    // ==========================================
    // 🛡️ 终极大满贯：优先查找 session_token
    const token = req.cookies.get("session_token")?.value 
               || req.cookies.get("next-auth.session-token")?.value 
               || req.cookies.get("__Secure-next-auth.session-token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "您还没有登录，请先登录再使用高级反推功能哦。" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      select: { userId: true, expires: true }
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "登录已失效，请重新登录。" }, { status: 401 });
    }

    // ==========================================
    // 🛡️ 新增：基于 Upstash Redis 的高频防刷限流
    // ==========================================
    const identifier = session.userId;
    const { success, limit, remaining, reset } = await analyzeRateLimit.limit(identifier);

    if (!success) {
      return new NextResponse(
        JSON.stringify({ 
          error: "解析请求过于频繁，保护机制已触发。请稍作休息（建议1分钟后再试）。",
        }), 
        { 
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
          } 
        }
      );
    }

    // ==========================================
    // 💰 调用我们的收费站逻辑（扣减免费次数）
    // ==========================================
    const quotaResult = await checkAndDeductQuota(session.userId);
    if (!quotaResult.allowed) {
      return NextResponse.json({ error: quotaResult.error }, { status: 403 }); 
    }

    // ==========================================
    // ✅ 校验通过！继续往下走原有的核心业务
    // ==========================================
    const formData = await req.formData();
    const analyzerModel = formData.get("analyzerModel") as string;
    const targetPlatform = formData.get("targetPlatform") as string || "generic";
    const inputType = formData.get("inputType") as string;
    
    const fileKeys = formData.getAll("fileKeys") as string[];
    if (!fileKeys || fileKeys.length === 0) return NextResponse.json({ error: "未接收到云端素材" }, { status: 400 });

    let selectedKey = KEYS.openai;
    let targetModel = analyzerModel;
    // 默认请求地址：中转平台
    let apiUrl = `${N1N_BASE_URL}/chat/completions`; 

    if (analyzerModel === 'gemini-free') {
      // 🌟 分流 A：只要是免费的 Flash，直接掏出官方钥匙，白嫖谷歌官方接口！
      selectedKey = process.env.GEMINI_API_KEY; 
      apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      targetModel = 'gemini-1.5-flash';
    } else if (analyzerModel.includes("gemini")) {
      // 🌟 分流 B：如果是 Gemini 的高级模型 (Pro 等)，依然走 N1N 中转平台！
      selectedKey = KEYS.gemini;
      targetModel = analyzerModel; 
    } else if (analyzerModel.includes("claude")) {
      selectedKey = KEYS.claude;
    }

    if (!selectedKey) {
      return NextResponse.json({ error: `服务端未配置该模型所属的 API Key` }, { status: 500 });
    }

    const fileKey = fileKeys[0];
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    });
    
   const fileUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 600 });

    // ==========================================
    // 🌟 新增：自动图片转码（谷歌官方接口拒收外链，必须喂 base64 文本）
    // ==========================================
    let finalImageUrl = fileUrl;
    if (apiUrl.includes("googleapis.com")) {
      try {
        const imgRes = await fetch(fileUrl);
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64String = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
        finalImageUrl = `data:${mimeType};base64,${base64String}`;
      } catch (err) {
        throw new Error("云端图片读取失败，请重试！");
      }
    }

    const systemPrompt = `你是一个世界顶级的多模态视觉解析专家与 AI 提示词（Prompt）工程师。
请仔细分析提供的视觉素材。

【动态与视频专属解析规则（极度重要）】
如果检测到素材包含动态变化（或输入类型为 ${inputType}），你必须极其详细地提取以下维度：
1. 镜头语言 (Camera Language)：是固定机位、推镜头(Zoom in)、拉镜头(Zoom out)、平移(Pan)、还是手持晃动感(Handheld)？
2. 动作序列 (Action Sequence)：主体在时间线内发生了什么具体动作？（例如：角色转头、眨眼、衣服飘动）
3. 物理与环境变化 (Dynamics)：光影的流转、天气变化、背景物体的运动等。

【输出丰富度要求】
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
            // 🌟 注意：这里换成了处理过后的 finalImageUrl
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

    // ==========================================
    // 🌟 彻底修复 404 错误：严格只使用 apiUrl，千万不要再拼 /chat/completions！
    // ==========================================
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
    
    // 💡 将剩余次数带回前端
    finalJSON._remainingQuota = quotaResult.remaining; 

    return NextResponse.json(finalJSON);

  } catch (error: any) {
    console.error("素材反推解析失败:", error);
    return NextResponse.json({ error: translateError(error.message) }, { status: 500 });
  }
}