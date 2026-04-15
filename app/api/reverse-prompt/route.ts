import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
  let friendlyMsg = `⚠️ 解析失败: ${errorMsg}`;
  
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded")) friendlyMsg = "😴 服务器排队人数过多，大模型暂无响应。";
  if (msg.includes("401") || msg.includes("api_key_invalid")) friendlyMsg = "🔑 API 密钥无效或配置错误。";
  if (msg.includes("insufficient quota")) friendlyMsg = "💰 账户余额或配额不足。";
  
  // 💡 明确的退还提示
  return `${friendlyMsg}\n\n♻️ 拦截生效：系统已为您自动退还本次消耗的 1 次高级额度！请稍后重试。`;
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
        throw new Error("大模型生成的 JSON 格式彻底混乱");
      }
    }
    throw new Error("未找到 JSON 结构，AI 可能偷懒了，请重试。");
  }
}

async function reversePromptHandler(req: NextRequest, context: { userId: string; remainingQuota?: number }) {
  try {
    const body = await req.json();
    const { analyzerModel, inputType, fileKeys } = body;
    
    if (!fileKeys || !Array.isArray(fileKeys) || fileKeys.length === 0) {
        throw new Error("未接收到云端素材");
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

    // ==========================================
    // ☢️ 终极魔鬼导演提示词 (彻底压榨大模型)
    // ==========================================
    const systemPrompt = `你现在是一名患有极度强迫症的好莱坞顶级分镜头（Storyboard）导演和视觉特效总监。
你的任务是极其苛刻的：必须对提供的素材进行【逐帧级别】的无死角拆解，生成超越原画质的顶级 Prompt！

【🚨 核心禁忌与惩罚机制】
1. 严禁使用任何空洞形容词（如：震撼、美丽、宏大）。必须全部替换为精确的物理量和镜头语言！
2. 不允许一句话带过！必须按照时间轴或空间层次进行【分镜头切分】描述。

【🎬 逐帧描述要求】
1. 景别与运镜：大远景(EWS)、特写(CU)、极高特写(ECU)？镜头是推(Dolly in)、摇(Pan)、轨道移动(Tracking)？
2. 主体微表情与微动作：眼睑的抽动、毛发在风中的偏转角度、瞳孔的漫反射光、衣物布料的物理拉扯。
3. 光影与流体物理：体积光(Volumetric lighting)、次表面散射、流体力学模拟(Fluid dynamics)、粒子碰撞(Particle collision)、丁达尔效应穿透角度。

【📜 强制 JSON 输出结构 (不能遗漏任何一个平台)】
你必须同时为以下所有 11 个平台输出专属的提示词变体。
- Midjourney/Stable Diffusion 偏向：构图参数、镜头参数、渲染器名称。
- Sora/Runway/Kling 等视频平台偏向：极强的时间连贯性(temporal consistency)、精确的分镜头动作描述、动态模糊参数。

严格按照以下 JSON 格式输出，不能缺少任何一个 key：
{
  "summary": [{"label":"逐帧核心动作拆解","value":"..."}],
  "cinematography": [{"label":"工业级光影与焦段参数","value":"..."}],
  "prompts": {
    "simple": {"zh": "...(约100字)","en": "..."},
    "standard": {"zh": "...(包含微表情与材质,约250字)","en": "..."},
    "pro": {"zh": "...(终极分镜头脚本,极其变态的细节,必须突破400字!)","en": "..."}
  },
  "negativePrompt": {"zh": "...","en": "..."},
  "platformVariants": {
    "generic": {"zh": "...","en": "..."},
    "midjourney": {"zh": "...(含--ar --v 6.0等参数)","en": "..."},
    "stablediffusion": {"zh": "...(权重括号语法)","en": "..."},
    "leonardo": {"zh": "...","en": "..."},
    "sora": {"zh": "...(强调连贯物理规律)","en": "..."},
    "runway": {"zh": "...(强调运镜和连贯性)","en": "..."},
    "luma": {"zh": "...","en": "..."},
    "pika": {"zh": "...(含 -motion 等参数)","en": "..."},
    "jimeng": {"zh": "...","en": "..."},
    "keling": {"zh": "...(中文极度细节与微表情)","en": "..."},
    "doubao": {"zh": "...","en": "..."}
  },
  "disclaimer": "【导演剪辑版】逐帧微距拆解完毕，全平台兼容就绪。"
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
    finalJSON._remainingQuota = context.remainingQuota; 

    return NextResponse.json(finalJSON);

  } catch (error: any) {
    console.error("业务逻辑异常，触发回滚:", error);
    throw new Error(translateError(error.message));
  }
}

export const POST = withProtection(reversePromptHandler, {
  rateLimiter: analyzeRateLimit, 
  deductQuota: true              
});