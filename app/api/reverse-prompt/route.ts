import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 🚀 引入我们强大的全局包装器和限流器
import { withProtection } from "@/lib/api-wrapper";
import { analyzeRateLimit } from "@/lib/ratelimit";

export const maxDuration = 60;

// 1. 初始化 R2 客户端
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
  
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded")) friendlyMsg = "😴 服务器当前排队人数过多被挤爆了，请稍后重试。";
  if (msg.includes("401") || msg.includes("api_key_invalid")) friendlyMsg = "🔑 API 密钥无效或配置错误。";
  if (msg.includes("insufficient quota")) friendlyMsg = "💰 账户余额或配额不足。";
  if (msg.includes("not found")) friendlyMsg = "🔍 模型名称不匹配，请检查配置。";
  
  return `${friendlyMsg}\n\n♻️ 别担心，系统已自动为您退还本次失败消耗的 1 次额度！`;
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

async function reversePromptHandler(req: NextRequest, context: { userId: string; remainingQuota?: number }) {
  try {
    const body = await req.json();
    const { 
      analyzerModel, 
      targetPlatform = "generic", 
      inputType, 
      fileKeys 
    } = body;
    
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
        throw new Error("云端图片读取失败，请重试！");
      }
    }

    // ==========================================
    // ☢️ 核心进化：核弹级工业提示词系统
    // ==========================================
    const systemPrompt = `你现在是好莱坞顶级视觉特效总监兼全球顶尖的 AI 视频与绘画 Prompt 架构师。
你的任务是对用户上传的视觉素材进行“像素级”的深度拆解，并生成足以复刻甚至超越原素材画质的超级提示词！

【🚨 核心禁忌与惩罚机制（极其重要）】
绝对严禁使用空洞的形容词（如：美丽的、震撼的、奇幻的、宏大的、史诗级的）。你必须使用绝对客观、精确的摄影机参数与物理材质来描述画面！
❌ 错误示范：“一条震撼的巨龙在奇幻的云层中飞行。”
✅ 正确示范：“极高特写镜头（Extreme Close-up），一条覆满黑曜石般粗糙鳞片的巨龙，瞳孔散发着高强度的金黄色的体积光。巨龙张开双翼，伴随流体动力学模拟的云层扰动（Fluid Dynamics），镜头缓慢向后拉远（Dolly out），呈现电影级景深（Depth of Field），8k分辨率，辛烷渲染（Octane Render）。”

【🎬 工业级结构化解析公式（必须严格套用）】
你生成的 Prompt 必须涵盖以下 5 个维度：
1. 镜头语言 (Camera & Lens): 明确指出是广角(Wide angle)、特写(Macro)、FPV穿梭机视角，以及运动轨迹(Pan/Tilt/Tracking)和焦段(例如 35mm lens, f/1.8)。
2. 光影与色彩 (Lighting & Atmos): 描述主光源方向、边缘光(Rim light)、丁达尔效应(God rays)、全局光照(Global Illumination)。
3. 主体材质 (Textures): 皮肤的毛孔、鳞片的反射率、衣服的布料纹理、次表面散射(Subsurface scattering)。
4. 动作与物理时序 (Action & Dynamics) [视频专属]: 如果输入类型是 ${inputType} 且包含动作，必须描述微表情变化、风对毛发/衣服的吹动、烟雾流体的物理碰撞轨迹。
5. 终极画质词 (Render Boosters): 必须带上 "masterpiece, best quality, ultra-detailed, 8k resolution, cinematic lighting, photorealistic, Unreal Engine 5" 等触发极致画质的咒语。

【📜 输出要求】
- simple (精简版): 侧重核心主体和基础氛围 (约 80 字)
- standard (标准版): 包含主体、环境、光影、材质 (约 150 字)
- pro (专业版): 必须是极致细节的长段落，包含所有的镜头参数、物理变化、顶级渲染词汇 (至少 250 字以上)
- negativePrompt: 列出必须避免的负面因素 (如: blurry, low quality, deformed, mutated, text, watermark...)
- platformVariants: 针对 [${targetPlatform}] 给出最硬核的适配词。如果是视频模型(Sora/Runway/Kling)，必须极度强调"时序连贯性(temporal consistency)"和"流畅慢动作(smooth slow motion)"；如果是生图模型(Midjourney/SD)，请加入类似 "--ar 16:9 --v 6.0" 或专属画质 tag。

必须且只能输出纯 JSON 数据。严禁任何前言、后语或 Markdown 标记。严格遵循以下结构：
{
  "summary": [{"label":"主体与核心动作","value":"..."}],
  "cinematography": [{"label":"摄影机运动与光影工业参数","value":"..."}],
  "prompts": {
    "simple": {"zh": "...","en": "..."},
    "standard": {"zh": "...","en": "..."},
    "pro": {"zh": "...","en": "..."}
  },
  "negativePrompt": {"zh": "...","en": "..."},
  "platformVariants": {
    "${targetPlatform}": {"zh": "...","en": "..."}
  },
  "disclaimer": "工业级像素拆解完毕，已自动注入极高画质渲染参数。"
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
      temperature: 0.7, // 稍微提高一点温度，让 AI 的词汇更丰富
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
    console.error("素材反推业务逻辑异常，抛出给包装器执行回滚:", error);
    throw new Error(translateError(error.message));
  }
}

export const POST = withProtection(reversePromptHandler, {
  rateLimiter: analyzeRateLimit, 
  deductQuota: true              
});