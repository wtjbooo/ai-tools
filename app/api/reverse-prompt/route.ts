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
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  return "";
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
      { label: "主体", value: "主体识别中" }, { label: "场景", value: "场景识别中" }, { label: "动作", value: "动作识别中" },
      { label: "光线", value: "光线识别中" }, { label: "色彩", value: "色彩识别中" }, { label: "风格", value: "风格识别中" }
    ]),
    cinematography: normalizeBlocks(input?.cinematography, [
      { label: "景别", value: "景别分析中" }, { label: "运镜", value: "运镜分析中" }, { label: "构图", value: "构图分析中" },
      { label: "节奏", value: "节奏分析中" }, { label: "氛围", value: "氛围分析中" }
    ]),
    prompts: {
      simple: normalizePromptText(input?.prompts?.simple, { zh: "生成中...", en: "Generating..." }),
      standard: normalizePromptText(input?.prompts?.standard, { zh: "生成中...", en: "Generating..." }),
      pro: normalizePromptText(input?.prompts?.pro, { zh: "生成中...", en: "Generating..." }),
    },
    negativePrompt: normalizePromptText(input?.negativePrompt, {
      zh: "低质量，模糊，噪点，畸形手部，解剖错误，过曝，背景杂乱，闪烁，文字水印",
      en: "low quality, blurry, noisy, malformed hands, bad anatomy, overexposed, messy background, flicker, text, watermark",
    }),
    platformVariants: {
      generic: normalizePromptText(input?.platformVariants?.generic, { zh: "生成中...", en: "Generating..." }),
      midjourney: normalizePromptText(input?.platformVariants?.midjourney, { zh: "生成中...", en: "Generating..." }),
      stablediffusion: normalizePromptText(input?.platformVariants?.stablediffusion, { zh: "生成中...", en: "Generating..." }),
      leonardo: normalizePromptText(input?.platformVariants?.leonardo, { zh: "生成中...", en: "Generating..." }),
      sora: normalizePromptText(input?.platformVariants?.sora, { zh: "生成中...", en: "Generating..." }),
      luma: normalizePromptText(input?.platformVariants?.luma, { zh: "生成中...", en: "Generating..." }),
      jimeng: normalizePromptText(input?.platformVariants?.jimeng, { zh: "生成中...", en: "Generating..." }),
      keling: normalizePromptText(input?.platformVariants?.keling, { zh: "生成中...", en: "Generating..." }),
      runway: normalizePromptText(input?.platformVariants?.runway, { zh: "生成中...", en: "Generating..." }),
      pika: normalizePromptText(input?.platformVariants?.pika, { zh: "生成中...", en: "Generating..." }),
      doubao: normalizePromptText(input?.platformVariants?.doubao, { zh: "生成中...", en: "Generating..." }),
    },
    disclaimer: typeof input?.disclaimer === "string" && input.disclaimer.trim() ? input.disclaimer.trim() : "生成结果用于创作参考，不代表原始模型参数或完整原始提示词。",
  };
}

function normalizeOutputLanguage(value: string): OutputLanguage {
  if ((OUTPUT_LANGUAGE_VALUES as readonly string[]).includes(value)) return value as OutputLanguage;
  return "zh";
}
function normalizeOutputStyle(value: string): OutputStyle {
  if ((OUTPUT_STYLE_VALUES as readonly string[]).includes(value)) return value as OutputStyle;
  return "standard";
}
function normalizeTargetPlatform(value: string): TargetPlatform {
  if ((TARGET_PLATFORM_VALUES as readonly string[]).includes(value)) return value as TargetPlatform;
  return "generic";
}

function buildInstruction(fileCount: number, preferences: { outputLanguage: OutputLanguage; outputStyle: OutputStyle; targetPlatform: TargetPlatform; }) {
  return [
    "你是一名擅长影视画面拆解与 AI 视频提示词重建的视觉分析助手。",
    `本次共输入 ${fileCount} 个视觉素材(图片或短视频)，请综合其中稳定一致的视觉特征进行判断。`,
    "只保留高置信度、可复用的信息，不要把偶发细节、边缘噪声写成核心结论。",
    "1. 提取主体、场景、动作/状态、光线、色彩、风格等高复用信息。",
    "2. 分析景别、机位/角度、构图、景深/焦点、运动感、氛围等镜头语言。",
    "3. 输出适合 AI 图像/视频继续创作使用的 Prompt。",
    "4. 输出中英双语。simple更短；standard平衡；pro细致克制。",
    "5. platformVariants 中，generic/runway/pika/midjourney/sora/luma 用自然英文，Midjourney 版务必结尾加参数（如 --ar 16:9）；jimeng/keling/doubao 用自然生动的中文提示词。",
    "6. negativePrompt 要结合画面给出贴切风险项，逗号分隔。",
    `7. 偏好：语言=${preferences.outputLanguage}，风格=${preferences.outputStyle}，平台=${preferences.targetPlatform}。可将此偏好作为表达重心。`,
    "8. 严格返回完整 JSON，禁止输出 markdown 或解释语。",
  ].join("\n");
}

async function fileToInlinePart(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return { inlineData: { mimeType: file.type, data: bytes.toString("base64") } };
}

async function fileToBase64String(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return bytes.toString("base64");
}

async function updateTaskSafely(taskId: string, data: Prisma.ReversePromptTaskUpdateInput) {
  try {
    await prisma.reversePromptTask.update({ where: { id: taskId }, data });
  } catch (error) {
    console.error("reverse-prompt task update error:", error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = String(searchParams.get("taskId") || "").trim();
    if (!taskId) return jsonError("缺少 taskId。", 400);

    const task = await prisma.reversePromptTask.findUnique({
      where: { id: taskId },
      select: {
        id: true, status: true, inputType: true, sourceCount: true, inputUrls: true,
        outputLanguage: true, outputStyle: true, targetPlatform: true, model: true,
        resultJson: true, normalizedResultJson: true, errorMessage: true,
        createdAt: true, startedAt: true, finishedAt: true,
      },
    });

    if (!task) return jsonError("未找到对应任务。", 404);

    const result = safeJsonParse(task.resultJson, null);
    const normalized = safeJsonParse(task.normalizedResultJson, null);
    const inputFiles = safeJsonParse(task.inputUrls, []);

    return NextResponse.json({
      ok: true,
      task: {
        id: task.id, status: task.status, inputType: task.inputType, sourceCount: task.sourceCount,
        inputFiles, outputLanguage: task.outputLanguage, outputStyle: task.outputStyle,
        targetPlatform: task.targetPlatform, model: task.model, errorMessage: task.errorMessage || "",
        createdAt: task.createdAt, startedAt: task.startedAt, finishedAt: task.finishedAt,
      },
      result, normalized,
    });
  } catch (error) {
    console.error("reverse-prompt get task error:", error);
    return jsonError("读取任务失败，请稍后再试。", 500);
  }
}

export async function POST(request: Request) {
  let taskId = "";

  try {
    let userId: string | null = null;
    try {
      const sessionToken = cookies().get("session_token")?.value;
      if (sessionToken) {
        const session = await prisma.session.findUnique({ where: { sessionToken } });
        if (session) userId = session.userId;
      }
    } catch (authError) {
      console.error("Failed to fetch user session:", authError);
    }

    const formData = await request.formData();
    const inputType = String(formData.get("inputType") || "images");
    const analyzerModel = String(formData.get("analyzerModel") || "gemini-free");
    const outputLanguage = normalizeOutputLanguage(String(formData.get("outputLanguage") || "zh"));
    const outputStyle = normalizeOutputStyle(String(formData.get("outputStyle") || "standard"));
    const targetPlatform = normalizeTargetPlatform(String(formData.get("targetPlatform") || "generic"));

    const isFreeModel = analyzerModel === "gemini-free";

    if (isFreeModel && !GEMINI_API_KEY) return jsonError("服务端尚未配置免费通道的 GEMINI_API_KEY", 500);
    if (!isFreeModel && !N1N_API_KEY) return jsonError("站长尚未配置中转 API Key，暂时无法使用 PRO 模型", 400);

    const files = formData.getAll("files").filter(isFile);

    if (files.length === 0) return jsonError("请先上传视觉素材。", 400);
    if (files.length > MAX_FILE_COUNT) return jsonError(`当前最多支持 ${MAX_FILE_COUNT} 个素材文件。`, 400);
    if (files.some((file) => !ALLOWED_FILE_TYPES.has(file.type))) return jsonError("仅支持 JPG, PNG, WEBP, MP4, MOV 格式。", 400);

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) return jsonError(`当前总素材体积超出限制。`, 400);

    const inputFiles: TaskInputFile[] = files.map((file) => ({ name: file.name, size: file.size, type: file.type }));
    const taskMeta = { fileCount: files.length, totalBytes, preferredOutput: { outputLanguage, outputStyle, targetPlatform } };

    const task = await prisma.reversePromptTask.create({
      data: {
        userId, status: "processing", inputType, sourceCount: files.length,
        inputUrls: safeJsonStringify(inputFiles, "[]"), outputLanguage, outputStyle,
        targetPlatform, model: isFreeModel ? GEMINI_MODEL : analyzerModel,
        metaJson: safeJsonStringify(taskMeta, "{}"), startedAt: new Date(),
      },
    });

    taskId = task.id;
    const instructionText = buildInstruction(files.length, { outputLanguage, outputStyle, targetPlatform });

    let rawResponseText = "";
    let payload: any = null;

    if (isFreeModel) {
      const imageParts = await Promise.all(files.map(fileToInlinePart));
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instructionText }, ...imageParts] }],
          generationConfig: { temperature: 0.35, responseMimeType: "application/json", responseJsonSchema: RESULT_SCHEMA },
        }),
      });

      rawResponseText = await response.text();

      try {
        payload = JSON.parse(rawResponseText);
      } catch {
        const msg = !response.ok ? "模型服务返回了不可解析的错误。" : "模型返回结果无法解析。";
        await updateTaskSafely(taskId, { status: "failed", errorMessage: msg, rawResponseText: safeText(rawResponseText), finishedAt: new Date() });
        return jsonError(msg, 502, rawResponseText);
      }

      if (!response.ok) {
        const msg = payload?.error?.message || "模型请求失败。";
        await updateTaskSafely(taskId, { status: "failed", errorMessage: safeText(msg), rawResponseText: safeText(rawResponseText), finishedAt: new Date() });
        return jsonError(msg, 502, payload);
      }

      const text = getTextFromGeminiPayload(payload);
      if (!text) {
        const msg = "模型没有返回可解析的结果。";
        await updateTaskSafely(taskId, { status: "failed", errorMessage: msg, rawResponseText: safeText(rawResponseText), finishedAt: new Date() });
        return jsonError(msg, 502, payload);
      }
      rawResponseText = text;

    } else {
      const messagesContent: any[] = [{ type: "text", text: instructionText + "\n\n返回 JSON：\n" + JSON.stringify(RESULT_SCHEMA) }];
      for (const file of files) {
        const base64Str = await fileToBase64String(file);
        messagesContent.push({ type: "image_url", image_url: { url: `data:${file.type};base64,${base64Str}` } });
      }

      const response = await fetch(`${N1N_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${N1N_API_KEY}` },
        body: JSON.stringify({ model: analyzerModel, messages: [{ role: "user", content: messagesContent }], response_format: { type: "json_object" }, temperature: 0.35 })
      });

      rawResponseText = await response.text();

      try {
        payload = JSON.parse(rawResponseText);
      } catch {
        const msg = !response.ok ? "高级模型服务不可用。" : "高级模型返回结果无法解析。";
        await updateTaskSafely(taskId, { status: "failed", errorMessage: msg, rawResponseText: safeText(rawResponseText), finishedAt: new Date() });
        return jsonError(msg, 502, rawResponseText);
      }

      if (!response.ok) {
        const msg = payload?.error?.message || "高级模型请求被拒绝。";
        await updateTaskSafely(taskId, { status: "failed", errorMessage: safeText(msg), rawResponseText: safeText(rawResponseText), finishedAt: new Date() });
        return jsonError(msg, 502, payload);
      }

      const text = getTextFromOpenAIPayload(payload);
      if (!text) {
        const msg = "高级模型没有返回有效结果。";
        await updateTaskSafely(taskId, { status: "failed", errorMessage: msg, rawResponseText: safeText(rawResponseText), finishedAt: new Date() });
        return jsonError(msg, 502, payload);
      }
      rawResponseText = text;
    }

    const rawResultText = stripJsonFence(rawResponseText);
    let parsed: any;

    try {
      parsed = JSON.parse(rawResultText);
    } catch {
      const message = "模型返回结果不是有效 JSON。";
      await updateTaskSafely(taskId, { status: "failed", errorMessage: message, rawResponseText: safeText(rawResponseText), rawResultJson: safeText(rawResultText), finishedAt: new Date() });
      return jsonError(message, 502, rawResponseText);
    }

    const result = normalizeResult(parsed);

    await updateTaskSafely(taskId, {
      status: "completed", errorMessage: "", rawResponseText: safeText(rawResponseText), rawResultJson: safeText(rawResultText),
      normalizedResultJson: safeJsonStringify(parsed, "{}"), resultJson: safeJsonStringify(result, "{}"), finishedAt: new Date(),
    });

    return NextResponse.json({ ok: true, result, meta: { taskId, model: isFreeModel ? GEMINI_MODEL : analyzerModel, fileCount: files.length, outputLanguage, outputStyle, targetPlatform } });

  } catch (error) {
    console.error("reverse-prompt api error:", error);
    if (taskId) {
      await updateTaskSafely(taskId, { status: "failed", errorMessage: safeText(error instanceof Error ? error.message : "分析失败。"), finishedAt: new Date() });
    }
    return jsonError("分析失败，请稍后再试。", 500);
  }
}