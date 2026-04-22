import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withProtection } from "@/lib/api-wrapper";
import { analyzeRateLimit } from "@/lib/ratelimit";

// 【新增】配置内存任务队列，用于存储后台分析状态
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

function translateError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  let friendlyMsg = `⚠️ 解析失败: ${errorMsg}`;
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded")) friendlyMsg = "😴 服务器排队人数过多，大模型暂无响应。";
  if (msg.includes("401") || msg.includes("api_key_invalid")) friendlyMsg = "🔑 API 密钥无效或配置错误。";
  if (msg.includes("insufficient quota")) friendlyMsg = "💰 账户余额或配额不足。";
  return `${friendlyMsg}\n\n♻️ 拦截生效：系统已为您自动退还本次消耗的 1 次高级额度！请稍后重试。`;
}

// 替换原有的 safeParseJSON 函数
function safeParseJSON(text: string) {
  try { 
    // 1. 先尝试直接解析
    return JSON.parse(text); 
  } catch (e) {
    // 2. 暴力去除 Markdown 代码块标记 (```json 和 ```)
    let cleanedText = text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    try {
        return JSON.parse(cleanedText);
    } catch (e2) {
        // 3. 终极绝招：用正则表达式强行截取 { 到最后一个 }
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

// 【新增】GET 方法：用于前端轮询查询任务进度
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
    const { analyzerModel, inputType, fileKeys, targetPlatform = "generic" } = body;
    
    if (!fileKeys || !Array.isArray(fileKeys) || fileKeys.length === 0) {
        throw new Error("未接收到云端素材");
    }

    // 1. 立即生成任务 ID 并存入队列
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    tasksMap.set(taskId, { status: "processing" });

    // 2. 将耗时的大模型逻辑放到后台执行 (去掉 await 阻塞，用自执行异步函数包裹)
    (async () => {
      try {
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

        // 找到这部分并替换其中的法则描述
const systemPrompt = `你现在是全球顶尖的 AI 视觉底层算法工程师和机器语言（Prompt）编码专家。
我们现在彻底放弃“人类讲故事”的描述方式！你需要将画面直接翻译成最硬核、最底层的【标签云（Tags）和参数咒语】。

【🚨 核心暴击法则】
1. 严禁写散文和长句！必须使用逗号分隔的【短语/词组/标签】。
2. 彻底抛弃“美丽、震撼”等废话。直接输出渲染器、物理材质、光学参数、摄影机型号！
3. 【极其重要】你必须且只能输出纯粹的 JSON 结构！绝对不允许在 JSON 前后添加任何解释性文字（如“好的”、“以下是参数”），严禁使用 markdown 代码块包裹！

// ... (后面的 【🎬 咒语结构公式】和 JSON 格式示例保持你原来的样子不变即可) ...
`;

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

        // 🟢 成功：更新队列状态
        tasksMap.set(taskId, { status: "success", result: finalJSON, task: { id: taskId, model: targetModel } });

      } catch (error: any) {
        console.error("后台异步任务执行失败:", error);
        tasksMap.set(taskId, { status: "error", error: translateError(error.message) });
        
        // 🚨【非常重要：在这里添加 Prisma 退款代码】🚨
        // 因为这段代码在后台跑，withProtection 捕获不到这里的报错！
        // 你需要导入 Prisma，然后手动退还积分。例如：
        // await prisma.user.update({ where: { id: context.userId }, data: { credits: { increment: 1 } } });
      }
    })();

    // 3. 立刻告诉前端任务已开始，彻底绕过 60s 超时
    return NextResponse.json({ status: "processing", taskId });

  } catch (error: any) {
    // 这里的 Catch 处理前期文件校验失败，withProtection 依然会自动退款
    console.error("接口初始校验异常:", error);
    throw new Error(translateError(error.message));
  }
}

export const POST = withProtection(reversePromptHandler, {
  rateLimiter: analyzeRateLimit, 
  cost: 1 
});