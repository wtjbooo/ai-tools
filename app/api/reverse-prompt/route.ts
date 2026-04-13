import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const maxDuration = 60;

// 🚀 1. 初始化 R2 客户端（专门用来读取前端刚才传到云端的大视频）
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

// 🛡️ 统归 N1N 中转调度
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

// 🛡️ 究极防弹 JSON 提取器
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
    const formData = await req.formData();
    const analyzerModel = formData.get("analyzerModel") as string;
    const targetPlatform = formData.get("targetPlatform") as string || "generic";
    const inputType = formData.get("inputType") as string; // 获取前端传来的视频/图片标识
    
    // 🚀 2. 核心改变：不再接真实的文件，而是接存满大视频的“云端提取码”
    const fileKeys = formData.getAll("fileKeys") as string[];

    if (!fileKeys || fileKeys.length === 0) return NextResponse.json({ error: "未接收到云端素材" }, { status: 400 });

    // 智能路由分配
    let selectedKey = KEYS.openai;
    let targetModel = analyzerModel;

    if (analyzerModel.includes("gemini")) {
      selectedKey = KEYS.gemini;
      targetModel = analyzerModel === 'gemini-free' ? 'gemini-2.5-flash' : analyzerModel;
    } else if (analyzerModel.includes("claude")) {
      selectedKey = KEYS.claude;
    }

    if (!selectedKey) {
      return NextResponse.json({ error: `服务端未配置该模型所属的 API Key` }, { status: 500 });
    }

    // 🚀 3. 给大模型开“介绍信”：去 R2 仓库拿这个视频
    const fileKey = fileKeys[0];
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    });
    
    // 生成一个有效期为 10 分钟的临时下载链接，专门给大模型去拉取素材
    const fileUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 600 });

    // 🚀 4. 视频级强化 System Prompt（史诗级防偷懒指令）
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
            // 🚀 5. 把刚生成的“临时提货链接”喂给模型
            { type: "image_url", image_url: { url: fileUrl } }
          ]
        }
      ],
      temperature: 0.6,
      stream: false 
    };

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
    
    const finalJSON = safeParseJSON(content);
    return NextResponse.json(finalJSON);

  } catch (error: any) {
    console.error("素材反推解析失败:", error);
    return NextResponse.json({ error: translateError(error.message) }, { status: 500 });
  }
}