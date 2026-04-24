import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withProtection } from "@/lib/api-wrapper";
import { analyzeRateLimit } from "@/lib/ratelimit";
import prisma from "@/lib/prisma"; // 引入数据库
import { getModelCost } from "@/lib/pricing"; // 引入物价局

// 配置内存任务队列，用于存储后台分析状态
const globalForTasks = global as unknown as { aiTasks: Map<string, any> };
const tasksMap = globalForTasks.aiTasks || new Map();
if (process.env.NODE_ENV !== "production") globalForTasks.aiTasks = tasksMap;

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

function translateError(errorMsg: string, cost: number = 1): string {
  const msg = errorMsg.toLowerCase();
  let friendlyMsg = `⚠️ 解析失败: ${errorMsg}`;
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded")) friendlyMsg = "😴 服务器排队人数过多，大模型暂无响应。";
  if (msg.includes("401") || msg.includes("api_key_invalid")) friendlyMsg = "🔑 API 密钥无效或配置错误。";
  if (msg.includes("insufficient quota")) friendlyMsg = "💰 账户余额或配额不足。";
  return `${friendlyMsg}\n\n♻️ 拦截生效：系统已为您自动退还本次消耗的 ${cost} 积分！请稍后重试。`;
}

function safeParseJSON(text: string) {
  try { 
    return JSON.parse(text); 
  } catch (e) {
    let cleanedText = text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    try {
        return JSON.parse(cleanedText);
    } catch (e2) {
        const start = cleanedText.indexOf('{');
        const end = cleanedText.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          try {
            return JSON.parse(cleanedText.substring(start, end + 1));
          } catch (err) {
            throw new Error("大模型生成的 JSON 格式彻底混乱");
          }
        }
        throw new Error("未找到 JSON 结构，AI 可能偷懒了，请重试。");
    }
  }
}

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });

  const task = tasksMap.get(taskId);
  if (!task) {
    return NextResponse.json({ error: "任务已过期或不存在" }, { status: 404 });
  }

  return NextResponse.json(task);
}

async function reversePromptHandler(req: NextRequest, context: { userId: string; remainingQuota?: number }) {
  try {
    const body = await req.json();
    const { analyzerModel, inputType, fileKeys, targetPlatform = "generic", engineMode } = body;
    
    if (!fileKeys || !Array.isArray(fileKeys) || fileKeys.length === 0) {
        throw new Error("未接收到云端素材");
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    tasksMap.set(taskId, { status: "processing" });

    (async () => {
      try {
        let selectedKey = KEYS.openai;
        let targetModel = analyzerModel;
        let apiUrl = `${N1N_BASE_URL}/chat/completions`; 

        // ==========================================
        // 🚀 核心逻辑：引擎偏好设置拦截器 (Model Routing)
        // ==========================================
        if (engineMode === "speed") {
          // 【极速轻量模式】：强制接管，调用极速视觉模型
          targetModel = "gpt-4o-mini"; // 速度最快，成本极低
          selectedKey = KEYS.openai;
          apiUrl = `${N1N_BASE_URL}/chat/completions`;
        } else if (engineMode === "quality") {
          // 【深度推理模式】：强制接管，调用满血视觉大模型
          targetModel = "gpt-4o"; // 画质理解天花板（如果你有 Claude 可以换成 claude-3.5-sonnet）
          selectedKey = KEYS.openai;
          apiUrl = `${N1N_BASE_URL}/chat/completions`;
        } else {
          // 【兼容模式】：如果前端没传偏好设置，走原有的默认兜底逻辑
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
        }

        if (!selectedKey) throw new Error(`服务端未配置该模型所属的 API Key`);

        const fileKey = fileKeys[0];
        const getCommand = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: fileKey });
        const fileUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 600 });

        let finalImageUrl = fileUrl;
        if (apiUrl.includes("googleapis.com")) {
          const imgRes = await fetch(fileUrl);
          const arrayBuffer = await imgRes.arrayBuffer();
          finalImageUrl = `data:${imgRes.headers.get('content-type') || 'image/jpeg'};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
        }

        const systemPrompt = `你现在是全球顶尖的 AI 视觉底层算法工程师和机器语言（Prompt）编码专家。
我们现在彻底放弃“人类讲故事”的描述方式！你需要将画面直接翻译成最硬核、最底层的【标签云（Tags）和参数咒语】。

【🚨 核心暴击法则】
1. 严禁写散文和长句！必须使用逗号分隔的【短语/词组/标签】。
2. 彻底抛弃“美丽、震撼”等废话。直接输出渲染器、物理材质、光学参数、摄影机型号！
3. 【极其重要】你必须且只能输出纯粹的 JSON 结构！绝对不允许在 JSON 前后添加任何解释性文字（如“好的”、“以下是参数”），严禁使用 markdown 代码块包裹！

【🎬 咒语结构公式（严格用逗号分隔）】
[主体精确白描], [细微物理运动], [摄影机型号与焦段], [运镜轨迹], [光照角度与类型], [材质纹理], [渲染引擎与画质参数]

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
    "generic": {"zh": "硬核标签...","en": "..."},
    "midjourney": {"zh": "标签..., --ar 16:9 --v 6.0","en": "..."},
    "stablediffusion": {"zh": "(masterpiece:1.2), 标签...","en": "..."},
    "leonardo": {"zh": "标签...","en": "..."},
    "sora": {"zh": "标签..., 时序连贯, 物理真实","en": "..."},
    "runway": {"zh": "标签..., 电影级平滑运镜, 高帧率","en": "..."},
    "luma": {"zh": "标签...","en": "..."},
    "pika": {"zh": "标签..., -motion 7","en": "..."},
    "jimeng": {"zh": "电影级标签...","en": "..."},
    "keling": {"zh": "精细动作与材质标签...","en": "..."},
    "doubao": {"zh": "中文标签...","en": "..."}
  },
  "disclaimer": "【机器底层指令】已转换为纯参数化 Tag 标签矩阵，直达大模型潜空间。"
}`;

        const payload: any = {
          model: targetModel,
          messages: [{ role: "user", content: [{ type: "text", text: systemPrompt }, { type: "image_url", image_url: { url: finalImageUrl } }] }],
          temperature: 0.6,
          stream: false 
        };

        if (targetModel.includes("gpt")) payload.response_format = { type: "json_object" };

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${selectedKey}` },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        if (!response.ok) {
          let errMsg = `HTTP ${response.status}`;
          try { errMsg = JSON.parse(responseText).error?.message || errMsg; } catch (e) {} 
          throw new Error(errMsg);
        }

        const payloadData = JSON.parse(responseText);
        const finalJSON = safeParseJSON(payloadData.choices[0].message.content);
        finalJSON._remainingQuota = context.remainingQuota; 

        // ==========================================
        // 🚀 新增：将后台异步生成的任务记录写入大盘流水表
        // ==========================================
        if (context.userId) {
          try {
            // 尝试从 AI 生成的结果中提取一小段中文作为标题，如果没有就用默认值
            const generatedText = finalJSON.prompts?.simple?.zh || "图像视觉分析与提示词反推";
            const cleanTitle = generatedText.replace(/[\r\n#*]/g, '').trim();
            const displayTitle = cleanTitle.length > 20 ? cleanTitle.slice(0, 20) + "..." : cleanTitle;
            
            // 动态读取本次反推的积分成本
            const actualCost = getModelCost(analyzerModel, 'vision');

            await prisma.aIGenerationRecord.create({
              data: {
                userId: context.userId,
                toolType: "reverse", // 标记为反推功能
                title: `反推: ${displayTitle}`, 
                originalInput: finalImageUrl,
                resultJson: JSON.stringify(finalJSON),
                cost: actualCost,
                status: "success"
              }
            });
          } catch (dbErr) {
            console.error("[写入流水表失败 - Reverse Prompt]:", dbErr);
          }
        }

        tasksMap.set(taskId, { status: "success", result: finalJSON, task: { id: taskId, model: targetModel } });

      } catch (error: any) {
        console.error("后台异步任务执行失败:", error);
        const refundCost = getModelCost(analyzerModel, 'vision');
        tasksMap.set(taskId, { status: "error", error: translateError(error.message, refundCost) });
        
        try {
          await prisma.user.update({
            where: { id: context.userId },
            data: { bonusCredits: { increment: refundCost } } 
          });
          console.log(`✅ 业务回滚成功: 已为用户 ${context.userId} 退还 ${refundCost} 积分`);
        } catch (dbError) {
          console.error("🚨 数据库退款执行失败:", dbError);
        }
      }
    })();

    return NextResponse.json({ status: "processing", taskId });

  } catch (error: any) {
    console.error("接口初始校验异常:", error);
    throw new Error(translateError(error.message));
  }
}

export const POST = withProtection(reversePromptHandler, {
  rateLimiter: analyzeRateLimit, 
  taskType: 'vision' 
});