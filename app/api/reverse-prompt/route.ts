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
    const { analyzerModel, inputType, fileKeys, targetPlatform = "generic" } = body;
    
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
    // ☢️ 终极机器底层打标系统 (放弃人类散文，全部改为 Tag 咒语)
    // ==========================================
    const systemPrompt = `你现在是全球顶尖的 AI 视觉底层算法工程师和机器语言（Prompt）编码专家。
我们现在彻底放弃“人类讲故事”的描述方式！你需要将画面直接翻译成最硬核、最底层的【标签云（Tags）和参数咒语】。

【🚨 核心暴击法则】
1. 严禁写散文和长句！必须使用逗号分隔的【短语/词组/标签】。
2. 彻底抛弃“美丽、震撼”等废话。直接输出渲染器、物理材质、光学参数、摄影机型号！

【🎬 咒语结构公式（严格用逗号分隔）】
[主体精确白描], [细微物理运动], [摄影机型号与焦段], [运镜轨迹], [光照角度与类型], [材质纹理], [渲染引擎与画质参数]

✅ 完美示例（必须模仿这种密集标签风格）：
"巨龙, 黑色黑曜石粗糙鳞片, 瞳孔散发金色体积光, 仰天长啸, 喷出高温白烟, 流体力学烟雾模拟, 极高特写(ECU), 摄影机缓慢向上摇(Tilt up), 丁达尔效应, 电影级逆光(Backlight), 8k分辨率, 虚幻引擎5渲染, 极致细节, 电影级调色"

【📜 强制 JSON 输出结构 (必须包含所有平台)】
- generic: 基础的标签云排列。
- midjourney: 标签云 + 末尾带上 "--ar 16:9 --v 6.0 --style raw" 等专属后缀。
- sora/runway/kling: 在标签云中强行插入 "temporal consistency, smooth slow motion, high framerate" 等视频专属参数。

严格按照以下 JSON 格式输出：
{
  "summary": [{"label":"核心实体标签","value":"巨龙, 黑曜石鳞片, 火焰..."}],
  "cinematography": [{"label":"光学与运动参数","value":"35mm镜头, F1.8大光圈, 体积光, Dolly In..."}],
  "prompts": {
    "simple": {"zh": "逗号分隔的 20 个核心标签","en": "Comma-separated core tags"},
    "standard": {"zh": "逗号分隔的 50 个详细视觉标签, 包含光影与材质","en": "..."},
    "pro": {"zh": "终极 Tag 矩阵！包含主体、动作、所有摄像机参数、光线跟踪、渲染器名称等至少 80 个标签，全部用逗号分隔！","en": "..."}
  },
  "negativePrompt": {"zh": "模糊, 变形, 噪点, 低画质, 动画感, 廉价感","en": "blurry, deformed, noise, low res, cartoon, cheap"},
  "platformVariants": {
    "generic": {"zh": "逗号分隔的硬核标签...","en": "..."},
    "midjourney": {"zh": "逗号分隔标签..., --ar 16:9 --v 6.0","en": "..."},
    "stablediffusion": {"zh": "(masterpiece:1.2), (ultra detailed:1.1), 逗号分隔标签...","en": "..."},
    "leonardo": {"zh": "逗号分隔标签...","en": "..."},
    "sora": {"zh": "逗号分隔标签..., 时序连贯, 物理真实","en": "..."},
    "runway": {"zh": "逗号分隔标签..., 电影级平滑运镜, 高帧率","en": "..."},
    "luma": {"zh": "逗号分隔标签...","en": "..."},
    "pika": {"zh": "逗号分隔标签..., -motion 7","en": "..."},
    "jimeng": {"zh": "逗号分隔的中文电影级标签...","en": "..."},
    "keling": {"zh": "逗号分隔的中文精细动作与材质标签...","en": "..."},
    "doubao": {"zh": "逗号分隔的中文标签...","en": "..."}
  },
  "disclaimer": "【机器底层指令】已转换为纯参数化 Tag 标签矩阵，直达大模型潜空间。"
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
  cost: 1 // 👈 完美修复：消耗高级 AI 算力，扣除 1 个积分！          
});