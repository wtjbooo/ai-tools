import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers"; 
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 建议配置 Vercel 超时时间，因为视频解析可能较长
export const maxDuration = 60; 

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// N1N 相关配置
const N1N_API_KEY = process.env.N1N_API_KEY; 
const N1N_BASE_URL = process.env.N1N_BASE_URL || "https://api.n1n.ai/v1";

const MAX_FILE_COUNT = 4;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 放宽至 50MB
const MAX_STORED_TEXT_LENGTH = 80_000;

// 扩充允许的文件类型，支持短视频
const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime" // MOV
]);

const OUTPUT_LANGUAGE_VALUES = ["zh", "en", "bilingual"] as const;
type OutputLanguage = (typeof OUTPUT_LANGUAGE_VALUES)[number];

const OUTPUT_STYLE_VALUES = ["simple", "standard", "pro"] as const;
type OutputStyle = (typeof OUTPUT_STYLE_VALUES)[number];

// 扩容平台，与前端 page.tsx 完全对齐
const TARGET_PLATFORM_VALUES = [
  "generic",
  "midjourney",
  "stablediffusion",
  "leonardo",
  "sora",
  "runway",
  "luma",
  "pika",
  "jimeng",
  "keling",
  "doubao"
] as const;
type TargetPlatform = (typeof TARGET_PLATFORM_VALUES)[number];

type TaskInputFile = {
  name: string;
  size: number;
  type: string;
};

// --- JSON Schema 定义区 ---
const promptTextSchema = {
  type: "object",
  properties: {
    zh: { type: "string" },
    en: { type: "string" },
  },
  required: ["zh", "en"],
  additionalProperties: false,
};

const analysisBlockSchema = {
  type: "object",
  properties: {
    label: { type: "string" },
    value: { type: "string" },
  },
  required: ["label", "value"],
  additionalProperties: false,
};

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "array", items: analysisBlockSchema, minItems: 5, maxItems: 8 },
    cinematography: { type: "array", items: analysisBlockSchema, minItems: 4, maxItems: 6 },
    prompts: {
      type: "object",
      properties: {
        simple: promptTextSchema,
        standard: promptTextSchema,
        pro: promptTextSchema,
      },
      required: ["simple", "standard", "pro"],
      additionalProperties: false,
    },
    negativePrompt: promptTextSchema,
    platformVariants: {
      type: "object",
      properties: {
        generic: promptTextSchema,
        midjourney: promptTextSchema,
        stablediffusion: promptTextSchema,
        leonardo: promptTextSchema,
        sora: promptTextSchema,
        runway: promptTextSchema,
        luma: promptTextSchema,
        pika: promptTextSchema,
        jimeng: promptTextSchema,
        keling: promptTextSchema,
        doubao: promptTextSchema,
      },
      // 必须包含所有平台
      required: TARGET_PLATFORM_VALUES as unknown as string[], 
      additionalProperties: false,
    },
    disclaimer: { type: "string" },
  },
  required: ["summary", "cinematography", "prompts", "negativePrompt", "platformVariants", "disclaimer"],
  additionalProperties: false,
};

// --- 工具函数区 ---
function jsonError(error: string, status = 400, details?: unknown) {
  return NextResponse.json({ error, details }, { status });
}

function isFile(value: FormDataEntryValue): value is File {
  return typeof value !== "string";
}

function stripJsonFence(input: string) {
  return input.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function safeText(input: string) {
  if (!input) return "";
  if (input.length <= MAX_STORED_TEXT_LENGTH) return input;
  return `${input.slice(0, MAX_STORED_TEXT_LENGTH)}\n...[truncated]`;
}

function safeJsonStringify(value: unknown, fallback: string) {
  try { return JSON.stringify(value); } catch { return fallback; }
}

function safeJsonParse<T>(input: string | null | undefined, fallback: T): T {
  if (!input) return fallback;
  try { return JSON.parse(input) as T; } catch { return fallback; }
}

function getTextFromGeminiPayload(payload: any) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim()) return part.text.trim();
    }
  }
  return "";
}

function getTextFromOpenAIPayload(payload: any) {
  try { return payload.choices[0].message.content; } 
  catch (e) { return ""; }
}

function normalizeBlocks(input: any, fallback: { label: string; value: string }[]) {
  if (!Array.isArray(input) || input.length === 0) return fallback;
  return input.filter((item) => item && typeof item.label === "string" && typeof item.value === "string" && item.label.trim() && item.value.trim())
    .map((item) => ({ label: item.label.trim(), value: item.value.trim() }));
}

function normalizePromptText(input: any, fallback: { zh: string; en: string }) {
  const zh = typeof input?.zh === "string" && input.zh.trim() ? input.zh.trim() : fallback.zh;
  const en = typeof input?.en === "string" && input.en.trim() ? input.en.trim() : fallback.en;
  return { zh, en };
}

function normalizeResult(input: any) {
  return {
    summary: normalizeBlocks(input?.summary, [
      { label: "主体", value: "主体识别结果生成中" },
      { label: "场景", value: "场景识别结果生成中" },
    ]),
    cinematography: normalizeBlocks(input?.cinematography, [
      { label: "景别", value: "景别分析生成中" },
      { label: "运镜", value: "运镜分析生成中" },
    ]),
    prompts: {
      simple: normalizePromptText(input?.prompts?.simple, { zh: "简短提示词", en: "Simple prompt" }),
      standard: normalizePromptText(input?.prompts?.standard, { zh: "标准提示词", en: "Standard prompt" }),
      pro: normalizePromptText(input?.prompts?.pro, { zh: "专业提示词", en: "Pro prompt" }),
    },
    negativePrompt: normalizePromptText(input?.negativePrompt, {
      zh: "低质量，模糊，噪点，畸形", en: "low quality, blurry, noisy, malformed"
    }),
    platformVariants: {
      generic: normalizePromptText(input?.platformVariants?.generic, { zh: "通用版", en: "Generic" }),
      midjourney: normalizePromptText(input?.platformVariants?.midjourney, { zh: "MJ版", en: "Midjourney" }),
      stablediffusion: normalizePromptText(input?.platformVariants?.stablediffusion, { zh: "SD版", en: "Stable Diffusion" }),
      leonardo: normalizePromptText(input?.platformVariants?.leonardo, { zh: "Leo版", en: "Leonardo" }),
      sora: normalizePromptText(input?.platformVariants?.sora, { zh: "Sora版", en: "Sora" }),
      runway: normalizePromptText(input?.platformVariants?.runway, { zh: "Runway版", en: "Runway" }),
      luma: normalizePromptText(input?.platformVariants?.luma, { zh: "Luma版", en: "Luma" }),
      pika: normalizePromptText(input?.platformVariants?.pika, { zh: "Pika版", en: "Pika" }),
      jimeng: normalizePromptText(input?.platformVariants?.jimeng, { zh: "即梦版", en: "Jimeng" }),
      keling: normalizePromptText(input?.platformVariants?.keling, { zh: "可灵版", en: "Kling" }),
      doubao: normalizePromptText(input?.platformVariants?.doubao, { zh: "豆包版", en: "Doubao" }),
    },
    disclaimer: typeof input?.disclaimer === "string" ? input.disclaimer.trim() : "生成结果用于创作参考。",
  };
}

function buildInstruction(fileCount: number, prefs: any, schemaStr: string) {
  return [
    "你是一名擅长影视画面拆解与 AI 视频/图像提示词重建的视觉分析助手。",
    `本次共输入 ${fileCount} 个多模态素材（图片或视频），请综合提取高复用信息。`,
    "任务目标：",
    "1. 提取主体、场景、动作、光线、色彩等信息，以及景别、运镜等镜头语言。",
    "2. 输出适合继续创作的 Prompt，包含中英双语。",
    "3. 根据不同平台（Midjourney, Sora, Luma, Runway 等）的特性，输出针对性的 platformVariants。",
    "4. 必须严格按照以下 JSON 结构输出，不可包含 Markdown 标签或额外解释：",
    schemaStr
  ].join("\n");
}

async function fileToBase64Data(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return {
    mimeType: file.type,
    base64: bytes.toString("base64"),
  };
}

async function updateTaskSafely(taskId: string, data: Prisma.ReversePromptTaskUpdateInput) {
  try {
    await prisma.reversePromptTask.update({ where: { id: taskId }, data });
  } catch (error) {
    console.error("Task update error:", error);
  }
}

// GET 请求保持原有逻辑，仅做基础保留
export async function GET(request: Request) {
  // ... [原样保留你原本的 GET 逻辑，为了代码简洁，这里略写核心，你原来的 GET 直接复制过来即可]
  return jsonError("暂略", 400); 
}

export async function POST(request: Request) {
  let taskId = "";

  try {
    // 1. 获取登录态
    let userId: string | null = null;
    try {
      const sessionToken = cookies().get("session_token")?.value;
      if (sessionToken) {
        const session = await prisma.session.findUnique({ where: { sessionToken } });
        if (session) userId = session.userId;
      }
    } catch (e) {}

    // 2. 解析表单
    const formData = await request.formData();
    const inputType = String(formData.get("inputType") || "images");
    const analyzerModel = String(formData.get("analyzerModel") || "gemini-free");
    
    const outputLanguage = OUTPUT_LANGUAGE_VALUES.includes(formData.get("outputLanguage") as any) ? formData.get("outputLanguage") : "zh";
    const outputStyle = OUTPUT_STYLE_VALUES.includes(formData.get("outputStyle") as any) ? formData.get("outputStyle") : "standard";
    const targetPlatform = TARGET_PLATFORM_VALUES.includes(formData.get("targetPlatform") as any) ? formData.get("targetPlatform") : "generic";

    // 3. API Key 防御检查
    if (analyzerModel === "gemini-free" && !GEMINI_API_KEY) {
      return jsonError("服务端未配置 GEMINI_API_KEY", 500);
    }
    if (analyzerModel !== "gemini-free" && !N1N_API_KEY) {
      return jsonError("服务端尚未配置 N1N_API_KEY，暂时无法使用 PRO 高级模型解析。", 400);
    }

    // 4. 文件校验
    const files = formData.getAll("files").filter(isFile);
    if (files.length === 0) return jsonError("请先上传参考素材。", 400);
    if (files.length > MAX_FILE_COUNT) return jsonError(`最多支持 ${MAX_FILE_COUNT} 个文件。`, 400);
    
    if (files.some((file) => !ALLOWED_FILE_TYPES.has(file.type))) {
      return jsonError("当前仅支持 JPG、PNG、WEBP 或 MP4/MOV 视频。", 400);
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      return jsonError("当前总文件体积请控制在 50MB 内。", 400);
    }

    // 5. 初始化数据库记录
    const inputFiles: TaskInputFile[] = files.map((file) => ({ name: file.name, size: file.size, type: file.type }));
    const taskMeta = { fileCount: files.length, totalBytes, preferredOutput: { outputLanguage, outputStyle, targetPlatform } };

    const task = await prisma.reversePromptTask.create({
      data: {
        userId: userId, 
        status: "processing",
        inputType,
        sourceCount: files.length,
        inputUrls: safeJsonStringify(inputFiles, "[]"),
        outputLanguage: outputLanguage as any,
        outputStyle: outputStyle as any,
        targetPlatform: targetPlatform as any,
        model: analyzerModel, 
        metaJson: safeJsonStringify(taskMeta, "{}"),
        startedAt: new Date(),
      },
    });
    taskId = task.id;

    // 6. 准备数据与 Prompt
    const schemaStr = JSON.stringify(RESULT_SCHEMA);
    const instruction = buildInstruction(files.length, { outputLanguage, outputStyle, targetPlatform }, schemaStr);
    const fileDatas = await Promise.all(files.map(fileToBase64Data));

    let rawResultText = "";
    let rawResponse = "";

    // ==========================================
    // 🚦 核心：双轨道智能分流 (Dual-Track)
    // ==========================================
    if (analyzerModel === "gemini-free") {
      // ---> 【轨道 A：完全免费版 Google Gemini】
      const imageParts = fileDatas.map(fd => ({ inlineData: { mimeType: fd.mimeType, data: fd.base64 } }));
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: instruction }, ...imageParts] }],
            generationConfig: {
              temperature: 0.35,
              responseMimeType: "application/json",
              responseJsonSchema: RESULT_SCHEMA,
            },
          }),
        }
      );
      
      rawResponse = await response.text();
      const payload = safeJsonParse<any>(rawResponse, null); // 👈 这里加上 <any>
      if (!response.ok || !payload) throw new Error(payload?.error?.message || "Gemini 请求失败");
      rawResultText = stripJsonFence(getTextFromGeminiPayload(payload));

    } else {
      // ---> 【轨道 B：N1N 高级模型 (OpenAI 协议)】
      // 将多个多模态内容组合为 OpenAI 的 content 数组
      const contentArray: any[] = [{ type: "text", text: instruction }];
      
      fileDatas.forEach(fd => {
        // N1N 大部分模型支持 data URI 协议传输多模态数据
        contentArray.push({
          type: "image_url",
          image_url: { url: `data:${fd.mimeType};base64,${fd.base64}` }
        });
      });

      const response = await fetch(`${N1N_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${N1N_API_KEY}`
        },
        body: JSON.stringify({
          model: analyzerModel, // 传递例如 'gemini-3.1-pro-preview' 或 'gpt-5.4'
          messages: [{ role: "user", content: contentArray }],
          temperature: 0.35,
          response_format: { type: "json_object" } // 强制 JSON
        }),
      });

      rawResponse = await response.text();
      const payload = safeJsonParse<any>(rawResponse, null); // 👈 这里加上 <any>
      if (!response.ok || !payload) throw new Error(payload?.error?.message || "N1N 平台请求失败");
      rawResultText = stripJsonFence(getTextFromOpenAIPayload(payload));
    }

    // 7. 结果校验与持久化
    const parsed = safeJsonParse(rawResultText, null);
    if (!parsed) throw new Error("模型返回的数据非合法 JSON");

    const result = normalizeResult(parsed);

    await updateTaskSafely(taskId, {
      status: "completed",
      errorMessage: "",
      rawResponseText: safeText(rawResponse),
      rawResultJson: safeText(rawResultText),
      normalizedResultJson: safeJsonStringify(parsed, "{}"),
      resultJson: safeJsonStringify(result, "{}"),
      finishedAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      result,
      meta: { taskId, model: analyzerModel, fileCount: files.length, outputLanguage, outputStyle, targetPlatform },
    });

  } catch (error: any) {
    console.error("reverse-prompt api error:", error);
    if (taskId) {
      await updateTaskSafely(taskId, {
        status: "failed",
        errorMessage: safeText(error.message || "分析失败，请稍后再试。"),
        finishedAt: new Date(),
      });
    }
    return jsonError(error.message || "分析失败，请稍后再试。", 500);
  }
}