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
    // ☢️ 终极魔鬼导演提示词 (彻底对标你发来的例子)
    // ==========================================
    const systemPrompt = `你现在是一名患有极度强迫症的好莱坞顶级分镜头导演，以及最顶尖的视频生成大模型（如 Sora, Runway Gen-3, Kling）提示词工程师。
你的任务是极其苛刻的：必须对提供的素材进行【Sora 级别的逐帧无死角拆解】，生成可以完美复刻甚至超越原画面的超级提示词！

【🚨 核心禁忌与法则（极其重要）】
1. 绝对严禁使用任何空洞形容词（如：震撼、美丽、宏大、奇幻）。所有的视觉效果，必须用【精确的物理参数、镜头运动轨迹、材质描述】来体现！
2. 不允许一段话带过！必须按照时间轴切分，写出包含转场、机位变化的【分镜头脚本】！

【🎬 逐帧描述结构（必须强制执行）】
生成的提示词必须包含以下结构特征：
- 总述：一句话概括整体美术风格、色调参数、核心氛围。
- 镜头切分格式：例如 "[0-2s] 镜头1：特写转全景 | 快速推入(Zoom in) - 描述画面主体与微表情..."
- 光影与物理：必须提及光源方向、体积光、流体力学模拟、布料/毛发的物理飘动等。
- 终极画质参数：必须在末尾带上类似 "8k resolution, cinematic lighting, masterpiece, ultra-detailed" 的后缀。

【📜 强制 JSON 输出结构 (不能遗漏任何一个平台)】
你必须同时为以下所有 11 个平台输出专属的提示词变体！不要只生成选中的平台，必须全都有！
如果是 Midjourney 等生图平台，可以省略时间轴，侧重静态构图和渲染参数；如果是视频平台，必须极度强调分镜头和运动。

严格按照以下 JSON 格式输出：
{
  "summary": [{"label":"逐帧核心动作拆解","value":"..."}],
  "cinematography": [{"label":"工业级光影与焦段参数","value":"..."}],
  "prompts": {
    "simple": {"zh": "...(约150字，侧重主体与基础氛围)","en": "..."},
    "standard": {"zh": "...(约250字，包含材质与部分运镜)","en": "..."},
    "pro": {"zh": "...(终极分镜头脚本！必须包含[0-2s]这种时间标记，必须突破400字，极度变态的细节！)","en": "..."}
  },
  "negativePrompt": {"zh": "...","en": "..."},
  "platformVariants": {
    "generic": {"zh": "...","en": "..."},
    "midjourney": {"zh": "...(侧重静态画质与 --ar 16:9 --v 6.0 等参数)","en": "..."},
    "stablediffusion": {"zh": "...(使用权重括号语法，极高画质)","en": "..."},
    "leonardo": {"zh": "...","en": "..."},
    "sora": {"zh": "...(极度强调物理时序连贯性和流体力学)","en": "..."},
    "runway": {"zh": "...(极度强调电影级运镜和动态模糊)","en": "..."},
    "luma": {"zh": "...","en": "..."},
    "pika": {"zh": "...(含 -motion 参数和分镜头)","en": "..."},
    "jimeng": {"zh": "...(中文语境的高手极分镜头)","en": "..."},
    "keling": {"zh": "...(极强的时间轴切分和物理微动细节)","en": "..."},
    "doubao": {"zh": "...(自然流畅的中文分镜头脚本)","en": "..."}
  },
  "disclaimer": "【导演剪辑版】Sora 级逐帧微距拆解完毕，全平台兼容就绪。"
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