import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const MAX_IMAGE_COUNT = 4;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_STORED_TEXT_LENGTH = 80_000;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const OUTPUT_LANGUAGE_VALUES = ["zh", "en", "bilingual"] as const;
type OutputLanguage = (typeof OUTPUT_LANGUAGE_VALUES)[number];

const OUTPUT_STYLE_VALUES = ["simple", "standard", "pro"] as const;
type OutputStyle = (typeof OUTPUT_STYLE_VALUES)[number];

const TARGET_PLATFORM_VALUES = [
  "generic",
  "jimeng",
  "keling",
  "runway",
  "pika",
] as const;
type TargetPlatform = (typeof TARGET_PLATFORM_VALUES)[number];

type TaskInputFile = {
  name: string;
  size: number;
  type: string;
};

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
    summary: {
      type: "array",
      items: analysisBlockSchema,
      minItems: 5,
      maxItems: 8,
    },
    cinematography: {
      type: "array",
      items: analysisBlockSchema,
      minItems: 4,
      maxItems: 6,
    },
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
        jimeng: promptTextSchema,
        keling: promptTextSchema,
        runway: promptTextSchema,
        pika: promptTextSchema,
      },
      required: ["generic", "jimeng", "keling", "runway", "pika"],
      additionalProperties: false,
    },
    disclaimer: { type: "string" },
  },
  required: [
    "summary",
    "cinematography",
    "prompts",
    "negativePrompt",
    "platformVariants",
    "disclaimer",
  ],
  additionalProperties: false,
};

function jsonError(error: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      error,
      details,
    },
    { status },
  );
}

function isFile(value: FormDataEntryValue): value is File {
  return typeof value !== "string";
}

function stripJsonFence(input: string) {
  return input
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function safeText(input: string) {
  if (!input) return "";
  if (input.length <= MAX_STORED_TEXT_LENGTH) return input;
  return `${input.slice(0, MAX_STORED_TEXT_LENGTH)}\n...[truncated]`;
}

function safeJsonStringify(value: unknown, fallback: string) {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function safeJsonParse<T>(input: string | null | undefined, fallback: T): T {
  if (!input) return fallback;

  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

function getTextFromGeminiPayload(payload: any) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim()) {
        return part.text.trim();
      }
    }
  }

  return "";
}

function normalizeBlocks(
  input: any,
  fallback: { label: string; value: string }[],
) {
  if (!Array.isArray(input) || input.length === 0) return fallback;

  return input
    .filter(
      (item) =>
        item &&
        typeof item.label === "string" &&
        typeof item.value === "string" &&
        item.label.trim() &&
        item.value.trim(),
    )
    .map((item) => ({
      label: item.label.trim(),
      value: item.value.trim(),
    }));
}

function normalizePromptText(input: any, fallback: { zh: string; en: string }) {
  const zh =
    typeof input?.zh === "string" && input.zh.trim()
      ? input.zh.trim()
      : fallback.zh;

  const en =
    typeof input?.en === "string" && input.en.trim()
      ? input.en.trim()
      : fallback.en;

  return { zh, en };
}

function normalizeResult(input: any) {
  return {
    summary: normalizeBlocks(input?.summary, [
      { label: "主体", value: "主体识别结果生成中" },
      { label: "场景", value: "场景识别结果生成中" },
      { label: "动作", value: "动作识别结果生成中" },
      { label: "光线", value: "光线识别结果生成中" },
      { label: "色彩", value: "色彩识别结果生成中" },
      { label: "风格", value: "风格识别结果生成中" },
    ]),
    cinematography: normalizeBlocks(input?.cinematography, [
      { label: "景别", value: "景别分析生成中" },
      { label: "运镜", value: "运镜分析生成中" },
      { label: "构图", value: "构图分析生成中" },
      { label: "节奏", value: "节奏分析生成中" },
      { label: "氛围", value: "氛围分析生成中" },
    ]),
    prompts: {
      simple: normalizePromptText(input?.prompts?.simple, {
        zh: "请重新生成精简版 Prompt。",
        en: "Please regenerate a concise prompt.",
      }),
      standard: normalizePromptText(input?.prompts?.standard, {
        zh: "请重新生成标准版 Prompt。",
        en: "Please regenerate a standard prompt.",
      }),
      pro: normalizePromptText(input?.prompts?.pro, {
        zh: "请重新生成专业版 Prompt。",
        en: "Please regenerate a professional prompt.",
      }),
    },
    negativePrompt: normalizePromptText(input?.negativePrompt, {
      zh: "低质量，模糊，噪点，畸形手部，解剖错误，过曝，背景杂乱，闪烁，文字水印",
      en: "low quality, blurry, noisy, malformed hands, bad anatomy, overexposed, messy background, flicker, text, watermark",
    }),
    platformVariants: {
      generic: normalizePromptText(input?.platformVariants?.generic, {
        zh: "请重新生成通用版 Prompt。",
        en: "Please regenerate a generic platform prompt.",
      }),
      jimeng: normalizePromptText(input?.platformVariants?.jimeng, {
        zh: "请重新生成即梦版 Prompt。",
        en: "Please regenerate a Jimeng prompt.",
      }),
      keling: normalizePromptText(input?.platformVariants?.keling, {
        zh: "请重新生成可灵版 Prompt。",
        en: "Please regenerate a Kling/Keling prompt.",
      }),
      runway: normalizePromptText(input?.platformVariants?.runway, {
        zh: "请重新生成 Runway 版 Prompt。",
        en: "Please regenerate a Runway prompt.",
      }),
      pika: normalizePromptText(input?.platformVariants?.pika, {
        zh: "请重新生成 Pika 版 Prompt。",
        en: "Please regenerate a Pika prompt.",
      }),
    },
    disclaimer:
      typeof input?.disclaimer === "string" && input.disclaimer.trim()
        ? input.disclaimer.trim()
        : "生成结果用于创作参考，不代表原始模型参数或完整原始提示词。",
  };
}

function normalizeOutputLanguage(value: string): OutputLanguage {
  if ((OUTPUT_LANGUAGE_VALUES as readonly string[]).includes(value)) {
    return value as OutputLanguage;
  }
  return "zh";
}

function normalizeOutputStyle(value: string): OutputStyle {
  if ((OUTPUT_STYLE_VALUES as readonly string[]).includes(value)) {
    return value as OutputStyle;
  }
  return "standard";
}

function normalizeTargetPlatform(value: string): TargetPlatform {
  if ((TARGET_PLATFORM_VALUES as readonly string[]).includes(value)) {
    return value as TargetPlatform;
  }
  return "generic";
}

function buildInstruction(
  fileCount: number,
  preferences: {
    outputLanguage: OutputLanguage;
    outputStyle: OutputStyle;
    targetPlatform: TargetPlatform;
  },
) {
  return [
    "你是一名擅长影视画面拆解与 AI 视频提示词重建的视觉分析助手。",
    `本次共输入 ${fileCount} 张关键帧图片，请综合多张图片中稳定一致的视觉特征进行判断。`,
    "只保留高置信度、可复用的信息，不要把偶发细节、边缘噪声或无法确认的内容写成核心结论。",
    "任务目标：",
    "1. 提取主体、场景、动作/状态、光线、色彩、风格等高复用信息。",
    "2. 分析景别、机位/角度、构图、景深/焦点、运动感、氛围等镜头语言。",
    "3. 输出适合 AI 图像/视频继续创作使用的 Prompt。",
    "4. 输出中英双语。",
    "5. prompts.simple 要更短更干净；prompts.standard 要平衡完整度；prompts.pro 要更细致但仍保持克制。",
    "6. platformVariants 中，generic / runway / pika 用更自然的英文；jimeng / keling 用自然中文。",
    "7. negativePrompt 不要使用机械的大而全模板，要结合当前画面类型给出更贴切的风险项，使用逗号分隔，适合直接复制。",
    "8. 不要编造相机型号、镜头焦段、品牌、幕后信息或不可从画面确认的设定。",
    "9. 风格保持高级、克制、可复用，不要写成营销文案。",
    `10. 当前用户偏好是：语言=${preferences.outputLanguage}，风格=${preferences.outputStyle}，平台=${preferences.targetPlatform}。虽然你需要返回完整 schema，但可将这一偏好作为默认表达重心。`,
    "11. 所有字段都要填写完整，禁止输出 markdown，禁止输出解释，只返回 JSON。",
  ].join("\n");
}

async function fileToInlinePart(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());

  return {
    inlineData: {
      mimeType: file.type,
      data: bytes.toString("base64"),
    },
  };
}

async function updateTaskSafely(
  taskId: string,
  data: Prisma.ReversePromptTaskUpdateInput,
) {
  try {
    await prisma.reversePromptTask.update({
      where: { id: taskId },
      data,
    });
  } catch (error) {
    console.error("reverse-prompt task update error:", error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = String(searchParams.get("taskId") || "").trim();

    if (!taskId) {
      return jsonError("缺少 taskId。", 400);
    }

    const task = await prisma.reversePromptTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        inputType: true,
        sourceCount: true,
        inputUrls: true,
        outputLanguage: true,
        outputStyle: true,
        targetPlatform: true,
        model: true,
        resultJson: true,
        normalizedResultJson: true,
        errorMessage: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
      },
    });

    if (!task) {
      return jsonError("未找到对应任务。", 404);
    }

    const result = safeJsonParse(task.resultJson, null);
    const normalized = safeJsonParse(task.normalizedResultJson, null);
    const inputFiles = safeJsonParse(task.inputUrls, []);

    return NextResponse.json({
      ok: true,
      task: {
        id: task.id,
        status: task.status,
        inputType: task.inputType,
        sourceCount: task.sourceCount,
        inputFiles,
        outputLanguage: task.outputLanguage,
        outputStyle: task.outputStyle,
        targetPlatform: task.targetPlatform,
        model: task.model,
        errorMessage: task.errorMessage || "",
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        finishedAt: task.finishedAt,
      },
      result,
      normalized,
    });
  } catch (error) {
    console.error("reverse-prompt get task error:", error);
    return jsonError("读取任务失败，请稍后再试。", 500);
  }
}

export async function POST(request: Request) {
  let taskId = "";

  try {
    if (!GEMINI_API_KEY) {
      return jsonError("服务端未配置 GEMINI_API_KEY", 500);
    }

    const formData = await request.formData();

    const inputType = String(formData.get("inputType") || "images");
    const outputLanguage = normalizeOutputLanguage(
      String(formData.get("outputLanguage") || "zh"),
    );
    const outputStyle = normalizeOutputStyle(
      String(formData.get("outputStyle") || "standard"),
    );
    const targetPlatform = normalizeTargetPlatform(
      String(formData.get("targetPlatform") || "generic"),
    );

    const files = formData.getAll("files").filter(isFile);

    if (inputType !== "images") {
      return jsonError("当前版本先支持关键帧图片分析。", 400);
    }

    if (files.length === 0) {
      return jsonError("请先上传关键帧图片。", 400);
    }

    if (files.length > MAX_IMAGE_COUNT) {
      return jsonError(`当前最多支持 ${MAX_IMAGE_COUNT} 张关键帧图片。`, 400);
    }

    if (files.some((file) => !ALLOWED_IMAGE_TYPES.has(file.type))) {
      return jsonError("当前仅支持 JPG、PNG、WEBP 图片。", 400);
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    if (totalBytes > MAX_TOTAL_BYTES) {
      return jsonError("当前总图片体积请控制在 4MB 内。", 400);
    }

    const inputFiles: TaskInputFile[] = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    const taskMeta = {
      fileCount: files.length,
      totalBytes,
      preferredOutput: {
        outputLanguage,
        outputStyle,
        targetPlatform,
      },
    };

    const task = await prisma.reversePromptTask.create({
      data: {
        status: "processing",
        inputType,
        sourceCount: files.length,
        inputUrls: safeJsonStringify(inputFiles, "[]"),
        outputLanguage,
        outputStyle,
        targetPlatform,
        model: GEMINI_MODEL,
        metaJson: safeJsonStringify(taskMeta, "{}"),
        startedAt: new Date(),
      },
    });

    taskId = task.id;

    const imageParts = await Promise.all(files.map(fileToInlinePart));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildInstruction(files.length, {
                    outputLanguage,
                    outputStyle,
                    targetPlatform,
                  }),
                },
                ...imageParts,
              ],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: "application/json",
            responseJsonSchema: RESULT_SCHEMA,
          },
        }),
      },
    );

    const raw = await response.text();

    let payload: any = null;

    try {
      payload = JSON.parse(raw);
    } catch {
      const message = !response.ok
        ? "模型服务返回了不可解析的错误信息。"
        : "模型返回结果无法解析。";

      await updateTaskSafely(taskId, {
        status: "failed",
        errorMessage: message,
        rawResponseText: safeText(raw),
        finishedAt: new Date(),
      });

      return jsonError(message, 502, raw);
    }

    if (!response.ok) {
      const message = payload?.error?.message || "模型请求失败，请稍后再试。";

      await updateTaskSafely(taskId, {
        status: "failed",
        errorMessage: safeText(message),
        rawResponseText: safeText(raw),
        finishedAt: new Date(),
      });

      return jsonError(message, 502, payload);
    }

    const text = getTextFromGeminiPayload(payload);

    if (!text) {
      const message = "模型没有返回可解析的结果。";

      await updateTaskSafely(taskId, {
        status: "failed",
        errorMessage: message,
        rawResponseText: safeText(raw),
        finishedAt: new Date(),
      });

      return jsonError(message, 502, payload);
    }

    const rawResultText = stripJsonFence(text);

    let parsed: any;

    try {
      parsed = JSON.parse(rawResultText);
    } catch {
      const message = "模型返回结果不是有效 JSON。";

      await updateTaskSafely(taskId, {
        status: "failed",
        errorMessage: message,
        rawResponseText: safeText(raw),
        rawResultJson: safeText(rawResultText),
        finishedAt: new Date(),
      });

      return jsonError(message, 502, text);
    }

    const result = normalizeResult(parsed);

    await updateTaskSafely(taskId, {
      status: "completed",
      errorMessage: "",
      rawResponseText: safeText(raw),
      rawResultJson: safeText(rawResultText),
      normalizedResultJson: safeJsonStringify(parsed, "{}"),
      resultJson: safeJsonStringify(result, "{}"),
      finishedAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      result,
      meta: {
        taskId,
        model: GEMINI_MODEL,
        fileCount: files.length,
        outputLanguage,
        outputStyle,
        targetPlatform,
      },
    });
  } catch (error) {
    console.error("reverse-prompt api error:", error);

    if (taskId) {
      await updateTaskSafely(taskId, {
        status: "failed",
        errorMessage: safeText(
          error instanceof Error ? error.message : "分析失败，请稍后再试。",
        ),
        finishedAt: new Date(),
      });
    }

    return jsonError("分析失败，请稍后再试。", 500);
  }
}