"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type InputType = "images" | "video";
type OutputLanguage = "zh" | "en" | "bilingual";
type OutputStyle = "simple" | "standard" | "pro";
type TargetPlatform = "generic" | "jimeng" | "keling" | "runway" | "pika";

type AnalysisBlock = {
  label: string;
  value: string;
};

type ApiResult = {
  summary: {
    source: string;
    platform: string;
    language: string;
    detailLevel: string;
    inputCount: number;
  };
  analysis: {
    subject: string;
    scene: string;
    action: string;
    lighting: string;
    colorTone: string;
    style: string;
    camera: string;
    rhythm: string;
  };
  prompts: {
    simple: string;
    standard: string;
    pro: string;
  };
  negativePrompt: string;
  platformVariants: {
    generic: string;
    jimeng: string;
    keling: string;
    runway: string;
    pika: string;
  };
  disclaimer: string;
};

type ApiTask = {
  id: string;
  status: string;
  inputType: InputType;
  outputLanguage: OutputLanguage;
  outputStyle: OutputStyle;
  targetPlatform: TargetPlatform;
  createdAt: string;
  updatedAt: string;
};

function PanelTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold tracking-tight text-gray-950">
        {title}
      </h2>
      {description ? (
        <p className="text-sm leading-6 text-gray-500">{description}</p>
      ) : null}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.alert("复制失败，请手动复制内容");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-gray-700 transition hover:-translate-y-0.5 hover:border-black/15 hover:bg-gray-50"
    >
      {copied ? "已复制" : "复制"}
    </button>
  );
}

export default function ReversePromptPage() {
  const [inputType, setInputType] = useState<InputType>("images");
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("zh");
  const [outputStyle, setOutputStyle] = useState<OutputStyle>("standard");
  const [targetPlatform, setTargetPlatform] =
    useState<TargetPlatform>("generic");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [task, setTask] = useState<ApiTask | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const acceptedTypes = useMemo(() => {
    return inputType === "images"
      ? "image/png,image/jpeg,image/webp"
      : "video/mp4,video/quicktime,video/webm";
  }, [inputType]);

  function isAcceptedFile(file: File) {
    if (inputType === "images") {
      return ["image/png", "image/jpeg", "image/webp"].includes(file.type);
    }

    return ["video/mp4", "video/quicktime", "video/webm"].includes(file.type);
  }

  function normalizeSelectedFiles(selectedFiles: File[]) {
    const filtered = selectedFiles.filter(isAcceptedFile);

    if (filtered.length !== selectedFiles.length) {
      window.alert(
        inputType === "images"
          ? "检测到不支持的文件类型，仅保留 PNG / JPG / WEBP"
          : "检测到不支持的文件类型，仅保留 MP4 / MOV / WEBM"
      );
    }

    const limited = inputType === "images" ? filtered.slice(0, 6) : filtered.slice(0, 1);

    if (filtered.length > limited.length) {
      window.alert(
        inputType === "images"
          ? "关键帧最多上传 6 张"
          : "短视频模式一次只支持上传 1 个文件"
      );
    }

    return limited;
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(normalizeSelectedFiles(selectedFiles));
    setApiError("");
  }

  function handleDragOver(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(event.dataTransfer.files || []);
    if (droppedFiles.length === 0) return;

    setFiles(normalizeSelectedFiles(droppedFiles));
    setApiError("");
  }

  function resetForm() {
    setFiles([]);
    setApiError("");
    setTask(null);
    setResult(null);
    setIsSubmitting(false);
    setIsDragOver(false);
  }

  async function handleAnalyze() {
    if (files.length === 0) {
      window.alert(inputType === "images" ? "请先上传关键帧图片" : "请先上传短视频");
      return;
    }

    setIsSubmitting(true);
    setApiError("");

    try {
      const inputUrls = files.map((file, index) => {
        const safeName = encodeURIComponent(file.name);
        return `local-upload://${inputType}/${index + 1}-${safeName}`;
      });

      const response = await fetch("/api/reverse-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputType,
          inputUrls,
          outputLanguage,
          outputStyle,
          targetPlatform,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "创建反向提示词任务失败");
      }

      setTask(data.task ?? null);
      setResult(data.result ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "分析失败，请稍后重试";
      setApiError(message);
      setTask(null);
      setResult(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  const summaryBlocks: AnalysisBlock[] = result
    ? [
        { label: "来源", value: result.summary.source },
        { label: "目标平台", value: result.summary.platform },
        { label: "输出语言", value: result.summary.language },
        { label: "输出风格", value: result.summary.detailLevel },
        { label: "输入数量", value: String(result.summary.inputCount) },
      ]
    : [];

  const analysisBlocks: AnalysisBlock[] = result
    ? [
        { label: "主体", value: result.analysis.subject },
        { label: "场景", value: result.analysis.scene },
        { label: "动作", value: result.analysis.action },
        { label: "光线", value: result.analysis.lighting },
        { label: "色彩", value: result.analysis.colorTone },
        { label: "风格", value: result.analysis.style },
        { label: "镜头", value: result.analysis.camera },
        { label: "节奏", value: result.analysis.rhythm },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-6">
        <section className="rounded-[30px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] px-6 py-8 shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:px-8 sm:py-10">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-black/10 bg-white/88 px-3.5 py-2 text-sm text-gray-700 transition hover:-translate-y-0.5 hover:border-black/15 hover:text-gray-950"
              >
                ← 返回首页
              </Link>

              <span className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3.5 py-2 text-sm text-gray-600">
                AI 反向提示词
              </span>
            </div>

            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-gray-500">
                REVERSE PROMPT MVP
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl sm:leading-[1.05]">
                AI 视频反向提示词生成器
              </h1>

              <p className="text-sm leading-7 text-gray-600 sm:text-base">
                上传关键帧或短视频，自动拆解画面主体、镜头语言和风格特征，并生成可复用的 Prompt。
              </p>

              <p className="text-xs leading-6 text-gray-500 sm:text-sm">
                当前先打通 MVP 主链路：页面提交 → API → 数据库存任务 → 返回结构化结果。暂不承诺还原原始模型输入参数或完整原始 Prompt。
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),340px]">
          <div className="space-y-6">
            <section className="rounded-[26px] border border-black/8 bg-white/92 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.05)] sm:p-6">
              <PanelTitle
                title="输入配置"
                description="先选择上传方式和输出偏好。第一版先用已选文件名跑通分析链路。"
              />

              <div className="mt-5 space-y-5">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">输入方式</div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setInputType("images");
                        setFiles([]);
                        setApiError("");
                        setTask(null);
                        setResult(null);
                        setIsDragOver(false);
                      }}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        inputType === "images"
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      上传关键帧图片
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInputType("video");
                        setFiles([]);
                        setApiError("");
                        setTask(null);
                        setResult(null);
                        setIsDragOver(false);
                      }}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        inputType === "video"
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      上传短视频
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-900">
                      输出语言
                    </label>
                    <select
                      value={outputLanguage}
                      onChange={(e) =>
                        setOutputLanguage(e.target.value as OutputLanguage)
                      }
                      className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-black/20"
                    >
                      <option value="zh">中文</option>
                      <option value="en">英文</option>
                      <option value="bilingual">中英双语</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-900">
                      输出风格
                    </label>
                    <select
                      value={outputStyle}
                      onChange={(e) =>
                        setOutputStyle(e.target.value as OutputStyle)
                      }
                      className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-black/20"
                    >
                      <option value="simple">精简版</option>
                      <option value="standard">标准版</option>
                      <option value="pro">专业版</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-900">
                      目标平台
                    </label>
                    <select
                      value={targetPlatform}
                      onChange={(e) =>
                        setTargetPlatform(e.target.value as TargetPlatform)
                      }
                      className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-black/20"
                    >
                      <option value="generic">通用版</option>
                      <option value="jimeng">即梦</option>
                      <option value="keling">可灵</option>
                      <option value="runway">Runway</option>
                      <option value="pika">Pika</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-[24px] border border-dashed border-black/12 bg-gray-50/80 p-5">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {inputType === "images" ? "上传关键帧图片" : "上传短视频"}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        {inputType === "images"
                          ? "建议上传 1～6 张关键帧，优先包含开头、中段、结尾和风格最明显的画面。"
                          : "建议上传 10 秒以内、30MB 以内的短视频。当前先用文件名占位跑通流程。"}
                      </p>
                    </div>

                    <label
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[20px] border px-6 py-8 text-center transition ${
                        isDragOver
                          ? "border-black/30 bg-white shadow-[0_0_0_4px_rgba(0,0,0,0.04)]"
                          : "border-black/10 bg-white hover:border-black/15 hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        点击上传或拖拽文件到这里
                      </div>
                      <div className="mt-2 text-xs leading-6 text-gray-500">
                        {inputType === "images"
                          ? "支持 PNG / JPG / WEBP"
                          : "支持 MP4 / MOV / WEBM"}
                      </div>

                      <input
                        type="file"
                        accept={acceptedTypes}
                        multiple={inputType === "images"}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {files.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-900">
                          已选择 {files.length} 个文件
                        </div>
                        <div className="space-y-2">
                          {files.map((file) => (
                            <div
                              key={`${file.name}-${file.lastModified}`}
                              className="rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm text-gray-700"
                            >
                              {file.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={handleAnalyze}
                        disabled={isSubmitting}
                        className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting ? "分析中..." : "开始分析"}
                      </button>

                      <button
                        type="button"
                        onClick={resetForm}
                        className="inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm text-gray-700 transition hover:-translate-y-0.5 hover:border-black/15 hover:bg-gray-50"
                      >
                        清空
                      </button>
                    </div>

                    {apiError ? (
                      <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {apiError}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            {task ? (
              <section className="rounded-[26px] border border-black/8 bg-white/92 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.05)] sm:p-6">
                <PanelTitle
                  title="任务信息"
                  description="当前这一步已经写入 ReversePromptTask，并返回分析结果。"
                />

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-[18px] border border-black/8 bg-white/80 px-4 py-3.5">
                    <div className="text-xs text-gray-500">任务 ID</div>
                    <div className="mt-1 break-all text-sm text-gray-800">
                      {task.id}
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-black/8 bg-white/80 px-4 py-3.5">
                    <div className="text-xs text-gray-500">状态</div>
                    <div className="mt-1 text-sm text-gray-800">{task.status}</div>
                  </div>

                  <div className="rounded-[18px] border border-black/8 bg-white/80 px-4 py-3.5">
                    <div className="text-xs text-gray-500">输入类型</div>
                    <div className="mt-1 text-sm text-gray-800">
                      {task.inputType}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {result ? (
              <>
                <section className="rounded-[26px] border border-black/8 bg-white/92 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.05)] sm:p-6">
                  <PanelTitle
                    title="内容拆解"
                    description="先把输入内容里最稳定、最可复用的显性特征提出来。"
                  />

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {summaryBlocks.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[18px] border border-black/8 bg-white/80 px-4 py-3.5"
                      >
                        <div className="text-xs text-gray-500">{item.label}</div>
                        <div className="mt-1 text-sm leading-7 text-gray-800">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {analysisBlocks.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[18px] border border-black/8 bg-white/80 px-4 py-3.5"
                      >
                        <div className="text-xs text-gray-500">{item.label}</div>
                        <div className="mt-1 text-sm leading-7 text-gray-800">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[26px] border border-black/8 bg-white/92 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.05)] sm:p-6">
                  <PanelTitle
                    title="Prompt 结果"
                    description="当前先返回三档结构化 Prompt，后续再替换成真分析结果。"
                  />

                  <div className="mt-5 space-y-4">
                    {[
                      { label: "精简版", value: result.prompts.simple },
                      { label: "标准版", value: result.prompts.standard },
                      { label: "专业版", value: result.prompts.pro },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[20px] border border-black/8 bg-white/85 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-gray-900">
                            {item.label}
                          </div>
                          <CopyButton text={item.value} />
                        </div>
                        <div className="mt-3 rounded-[16px] bg-gray-50/90 px-4 py-3 text-sm leading-7 text-gray-800">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[26px] border border-black/8 bg-white/92 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.05)] sm:p-6">
                  <PanelTitle
                    title="推荐负面词"
                    description="这里给的是规避常见瑕疵的建议，不代表原始负面词。"
                  />

                  <div className="mt-5 rounded-[20px] bg-gray-50/90 px-4 py-4 text-sm leading-7 text-gray-800">
                    {result.negativePrompt}
                  </div>
                </section>

                <section className="rounded-[26px] border border-black/8 bg-white/92 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.05)] sm:p-6">
                  <PanelTitle
                    title="平台适配版"
                    description="后续可以继续对即梦、可灵等平台做定制化增强。"
                  />

                  <div className="mt-5 space-y-4">
                    {Object.entries(result.platformVariants).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-[20px] border border-black/8 bg-white/85 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-gray-900">
                            {key}
                          </div>
                          <CopyButton text={value} />
                        </div>
                        <div className="mt-3 rounded-[16px] bg-gray-50/90 px-4 py-3 text-sm leading-7 text-gray-800">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
          </div>

          <aside className="space-y-6">
            <section className="rounded-[26px] border border-black/8 bg-white/92 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.05)] sm:p-6">
              <PanelTitle
                title="当前 MVP 范围"
                description="先把链路跑通，再逐步替换成真实上传和分析。"
              />

              <div className="mt-4 space-y-3 text-sm leading-7 text-gray-700">
                <div className="rounded-[18px] bg-gray-50/90 px-4 py-3.5">
                  第一步：页面选择文件并提交参数。
                </div>
                <div className="rounded-[18px] bg-gray-50/90 px-4 py-3.5">
                  第二步：API 创建 ReversePromptTask 并写入数据库。
                </div>
                <div className="rounded-[18px] bg-gray-50/90 px-4 py-3.5">
                  第三步：返回结构化结果，页面直接展示。
                </div>
              </div>
            </section>

            <section className="rounded-[26px] border border-black/8 bg-white/92 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.05)] sm:p-6">
              <PanelTitle
                title="结果说明"
                description="这段说明建议后续保留在真实结果页里。"
              />

              <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
                {result?.disclaimer ||
                  "当前结果为 AI 反向拆解后生成的高质量 Prompt 建议，不代表原始模型输入参数或完整原始提示词。"}
              </div>
            </section>

            <section className="rounded-[26px] border border-black/8 bg-white/92 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.05)] sm:p-6">
              <PanelTitle
                title="后续开发建议"
                description="现在已经不再是静态页，下一步就可以继续接真实上传。"
              />

              <div className="mt-4 space-y-3 text-sm leading-7 text-gray-700">
                <div className="rounded-[18px] bg-gray-50/90 px-4 py-3.5">
                  下一步可以接 Vercel Blob，把本地占位 URL 改成真实上传 URL。
                </div>
                <div className="rounded-[18px] bg-gray-50/90 px-4 py-3.5">
                  再下一步接关键帧分析逻辑，把 mock 结果替换成真结果。
                </div>
                <div className="rounded-[18px] bg-gray-50/90 px-4 py-3.5">
                  短视频版可以后置，不用一开始就上重型处理链路。
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}