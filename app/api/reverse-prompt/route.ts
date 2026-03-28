import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const MAX_IMAGE_COUNT = 4;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
  return input.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
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

function normalizeBlocks(input: any, fallback: { label: string; value: string }[]) {
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
    typeof input?.zh === "string" && input.zh.trim() ? input.zh.trim() : fallback.zh;
  const en =
    typeof input?.en === "string" && input.en.trim() ? input.en.trim() : fallback.en;

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

function buildInstruction(fileCount: number) {
  return [
    "你是一名擅长影视画面拆解与 AI 视频提示词重写的视觉分析助手。",
    `本次共输入 ${fileCount} 张关键帧图片，请综合多张图片中稳定一致的视觉特征进行判断。`,
    "任务目标：",
    "1. 提取主体、场景、动作、光线、色彩、风格等高复用信息。",
    "2. 分析景别、运镜、构图、节奏、氛围等镜头语言。",
    "3. 输出适合 AI 视频生成使用的 Prompt。",
    "4. 输出中英双语。",
    "5. 平台版本中：generic / runway / pika 用更自然的英文；jimeng / keling 用自然中文。",
    "6. 仅根据画面做高置信度推断，不要编造相机型号、镜头焦段或幕后信息。",
    "7. 风格上保持高级、克制、可复用，不要写成营销文案。",
    "8. negativePrompt 使用逗号分隔，适合直接复制。",
    "9. 所有字段都要填写完整，禁止输出 markdown，禁止输出解释，只返回 JSON。",
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

export async function POST(request: Request) {
  try {
    if (!GEMINI_API_KEY) {
      return jsonError("服务端未配置 GEMINI_API_KEY", 500);
    }

    const formData = await request.formData();
    const inputType = String(formData.get("inputType") || "images");
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
              parts: [{ text: buildInstruction(files.length) }, ...imageParts],
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
      if (!response.ok) {
        return jsonError("模型服务返回了不可解析的错误信息。", 502, raw);
      }
      return jsonError("模型返回结果无法解析。", 502, raw);
    }

    if (!response.ok) {
      return jsonError(
        payload?.error?.message || "模型请求失败，请稍后再试。",
        502,
        payload,
      );
    }

    const text = getTextFromGeminiPayload(payload);

    if (!text) {
      return jsonError("模型没有返回可解析的结果。", 502, payload);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(stripJsonFence(text));
    } catch {
      return jsonError("模型返回结果不是有效 JSON。", 502, text);
    }

    const result = normalizeResult(parsed);

    return NextResponse.json({
      ok: true,
      result,
      meta: {
        model: GEMINI_MODEL,
        fileCount: files.length,
      },
    });
  } catch (error) {
    console.error("reverse-prompt api error:", error);
    return jsonError("分析失败，请稍后再试。", 500);
  }
}