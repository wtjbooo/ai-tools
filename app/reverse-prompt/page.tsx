"use client";

import Link from "next/link";
import { type ChangeEvent, type ReactNode, useMemo, useState } from "react";

type InputType = "images" | "video";
type OutputLanguage = "zh" | "en" | "bilingual";
type OutputStyle = "simple" | "standard" | "pro";
type TargetPlatform = "generic" | "jimeng" | "keling" | "runway" | "pika";

type AnalysisBlock = {
  label: string;
  value: string;
};

type PromptText = {
  zh: string;
  en: string;
};

type ReversePromptResult = {
  summary: AnalysisBlock[];
  cinematography: AnalysisBlock[];
  prompts: Record<OutputStyle, PromptText>;
  negativePrompt: PromptText;
  platformVariants: Record<TargetPlatform, PromptText>;
  disclaimer: string;
};

const STYLE_LABELS: Record<OutputStyle, string> = {
  simple: "精简版",
  standard: "标准版",
  pro: "专业版",
};

const PLATFORM_LABELS: Record<TargetPlatform, string> = {
  generic: "通用版",
  jimeng: "即梦",
  keling: "可灵",
  runway: "Runway",
  pika: "Pika",
};

const LANGUAGE_LABELS: Record<OutputLanguage, string> = {
  zh: "中文",
  en: "English",
  bilingual: "中英双语",
};

const MAX_IMAGE_COUNT = 4;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

function getPromptByLanguage(value: PromptText, language: OutputLanguage) {
  if (language === "zh") return value.zh;
  if (language === "en") return value.en;
  return `${value.zh}\n\n${value.en}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function PanelTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-[21px] font-semibold tracking-tight text-gray-950 sm:text-[24px]">
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-6 text-gray-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.alert("复制失败，请手动复制内容");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:-translate-y-0.5 hover:border-black/15 hover:bg-gray-50"
    >
      {copied ? "已复制" : "复制"}
    </button>
  );
}

function OptionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm transition",
        active
          ? "border-black bg-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
          : "border-black/10 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-black/15 hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SoftCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-[28px] border border-black/8 bg-white/92 p-5 shadow-[0_10px_32px_rgba(15,23,42,0.05)] sm:p-6",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

export default function ReversePromptPage() {
  const [inputType, setInputType] = useState<InputType>("images");
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("zh");
  const [outputStyle, setOutputStyle] = useState<OutputStyle>("standard");
  const [targetPlatform, setTargetPlatform] =
    useState<TargetPlatform>("generic");
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<ReversePromptResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const acceptedTypes = useMemo(() => {
    return inputType === "images"
      ? "image/png,image/jpeg,image/webp"
      : "video/mp4,video/quicktime,video/webm";
  }, [inputType]);

  const totalBytes = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  );

  const primaryPrompt = result
    ? getPromptByLanguage(result.prompts[outputStyle], outputLanguage)
    : "";

  const primaryNegativePrompt = result
    ? getPromptByLanguage(result.negativePrompt, outputLanguage)
    : "";

  const primaryPlatformPrompt = result
    ? getPromptByLanguage(result.platformVariants[targetPlatform], outputLanguage)
    : "";

  const otherPromptVariants = result
    ? (
        Object.entries(result.prompts) as Array<[OutputStyle, PromptText]>
      ).filter(([key]) => key !== outputStyle)
    : [];

  const otherPlatformVariants = result
    ? (
        Object.entries(result.platformVariants) as Array<
          [TargetPlatform, PromptText]
        >
      ).filter(([key]) => key !== targetPlatform)
    : [];

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(selectedFiles);
    setError("");
  }

  function resetForm() {
    setFiles([]);
    setResult(null);
    setError("");
    setIsLoading(false);
  }

  async function handleAnalyze() {
    if (inputType === "video") {
      window.alert("当前版本先支持关键帧图片分析。短视频解析下一步接入。");
      return;
    }

    if (files.length === 0) {
      window.alert("请先上传关键帧图片");
      return;
    }

    if (files.length > MAX_IMAGE_COUNT) {
      window.alert(`当前最多支持 ${MAX_IMAGE_COUNT} 张关键帧图片`);
      return;
    }

    if (files.some((file) => !file.type.startsWith("image/"))) {
      window.alert("当前仅支持 JPG / PNG / WEBP 图片");
      return;
    }

    if (totalBytes > MAX_TOTAL_BYTES) {
      window.alert("当前总图片体积请控制在 4MB 内");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setResult(null);

      const formData = new FormData();
      formData.append("inputType", inputType);
      formData.append("outputLanguage", outputLanguage);
      formData.append("outputStyle", outputStyle);
      formData.append("targetPlatform", targetPlatform);

      for (const file of files) {
        formData.append("files", file);
      }

      const response = await fetch("/api/reverse-prompt", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "分析失败，请稍后再试");
      }

      setResult(payload.result as ReversePromptResult);

      window.setTimeout(() => {
        document
          .getElementById("reverse-prompt-result")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请稍后再试");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="space-y-6 sm:space-y-8">
        <section className="relative overflow-hidden rounded-[32px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] px-6 py-8 shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.10),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.08),transparent_26%)]" />

          <div className="relative space-y-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-black/10 bg-white/88 px-3.5 py-2 text-sm text-gray-700 transition hover:-translate-y-0.5 hover:border-black/15 hover:text-gray-950"
              >
                ← 返回首页
              </Link>

              <span className="inline-flex items-center rounded-full border border-black/8 bg-white/78 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-gray-500">
                AI REVERSE PROMPT
              </span>
            </div>

            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-[48px] sm:leading-[1.04]">
                从关键帧反推出可复用 Prompt
              </h1>

              <p className="max-w-2xl text-sm leading-7 text-gray-600 sm:text-[15px]">
                上传关键帧图片，自动拆解主体、镜头语言与风格特征，输出更适合继续创作的结果。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-black/8 bg-white/78 px-4 py-3">
                <div className="text-[11px] tracking-[0.16em] text-gray-500">
                  INPUT
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  关键帧图片
                </div>
              </div>

              <div className="rounded-[20px] border border-black/8 bg-white/78 px-4 py-3">
                <div className="text-[11px] tracking-[0.16em] text-gray-500">
                  ANALYSIS
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  内容 + 镜头 + 风格
                </div>
              </div>

              <div className="rounded-[20px] border border-black/8 bg-white/78 px-4 py-3">
                <div className="text-[11px] tracking-[0.16em] text-gray-500">
                  OUTPUT
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  Prompt / 负面词 / 平台适配
                </div>
              </div>
            </div>
          </div>
        </section>

        <SoftCard>
          <div className="space-y-5">
            <PanelTitle
              title="输入配置"
              description="选择输出偏好，然后上传关键帧开始分析。"
            />

            <div className="space-y-5">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">输入方式</div>
                <div className="flex flex-wrap gap-2.5">
                  <OptionButton
                    active={inputType === "images"}
                    onClick={() => {
                      setInputType("images");
                      setFiles([]);
                      setResult(null);
                      setError("");
                    }}
                  >
                    上传关键帧图片
                  </OptionButton>

                  <OptionButton
                    active={inputType === "video"}
                    onClick={() => {
                      setInputType("video");
                      setFiles([]);
                      setResult(null);
                      setError("");
                    }}
                  >
                    上传短视频
                  </OptionButton>
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
                    <option value="en">English</option>
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

              <div className="rounded-[24px] border border-dashed border-black/12 bg-[linear-gradient(180deg,rgba(250,250,250,0.72),rgba(255,255,255,0.98))] p-5 sm:p-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-900">
                      {inputType === "images" ? "上传关键帧图片" : "上传短视频"}
                    </div>
                    <p className="text-sm leading-6 text-gray-500">
                      {inputType === "images"
                        ? `建议上传 1～${MAX_IMAGE_COUNT} 张关键帧，优先选择风格最稳定、构图最明确的画面。`
                        : "短视频解析下一步接入。当前建议先上传关键帧图片，以获得更稳定结果。"}
                    </p>
                  </div>

                  <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-black/10 bg-white px-6 py-8 text-center transition hover:border-black/15 hover:bg-gray-50">
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
                    <div className="rounded-[20px] border border-black/8 bg-white/84 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-medium text-gray-900">
                          已选择 {files.length} 个文件
                        </div>
                        <div className="text-xs text-gray-500">
                          {LANGUAGE_LABELS[outputLanguage]} ·{" "}
                          {STYLE_LABELS[outputStyle]} ·{" "}
                          {PLATFORM_LABELS[targetPlatform]}
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-500">
                        总大小：{formatBytes(totalBytes)} / 4.00 MB
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {files.map((file) => (
                          <div
                            key={`${file.name}-${file.lastModified}`}
                            className="inline-flex max-w-full items-center rounded-full border border-black/8 bg-white px-3 py-2 text-sm text-gray-700"
                          >
                            <span className="truncate">
                              {file.name} · {formatBytes(file.size)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={isLoading}
                      className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      {isLoading ? "分析中..." : "开始分析"}
                    </button>

                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={isLoading}
                      className="inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm text-gray-700 transition hover:-translate-y-0.5 hover:border-black/15 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      清空
                    </button>
                  </div>

                  {error ? (
                    <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </SoftCard>

        {isLoading ? (
          <SoftCard>
            <PanelTitle
              title="正在分析"
              description="正在解析画面内容、镜头语言与风格特征。"
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-black/8 bg-white/86 px-4 py-4 text-sm text-gray-700">
                正在识别主体与场景
              </div>
              <div className="rounded-[18px] border border-black/8 bg-white/86 px-4 py-4 text-sm text-gray-700">
                正在整理镜头与风格特征
              </div>
              <div className="rounded-[18px] border border-black/8 bg-white/86 px-4 py-4 text-sm text-gray-700">
                正在生成 Prompt 与平台适配版
              </div>
            </div>
          </SoftCard>
        ) : null}

        {result ? (
          <div id="reverse-prompt-result" className="space-y-6 sm:space-y-8">
            <SoftCard>
              <PanelTitle
                title="内容拆解"
                description="提取画面中更稳定、可复用的核心特征。"
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.summary.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[18px] border border-black/8 bg-white/86 px-4 py-3.5"
                  >
                    <div className="text-xs text-gray-500">{item.label}</div>
                    <div className="mt-1 text-sm leading-7 text-gray-800">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </SoftCard>

            <SoftCard>
              <PanelTitle
                title="镜头与风格分析"
                description="更贴近视频生成场景需要的镜头语言与氛围表达。"
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.cinematography.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[18px] border border-black/8 bg-white/86 px-4 py-3.5"
                  >
                    <div className="text-xs text-gray-500">{item.label}</div>
                    <div className="mt-1 text-sm leading-7 text-gray-800">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </SoftCard>

            <SoftCard>
              <PanelTitle
                title="Prompt 结果"
                description="优先给出一版更适合直接复用的结果。"
                action={<CopyButton text={primaryPrompt} />}
              />

              <div className="mt-5 space-y-4">
                <div className="rounded-[22px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 sm:p-5">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      推荐 Prompt
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {STYLE_LABELS[outputStyle]} ·{" "}
                      {LANGUAGE_LABELS[outputLanguage]}
                    </div>
                  </div>

                  <div className="mt-4 whitespace-pre-line rounded-[18px] bg-gray-50/90 px-4 py-4 text-sm leading-7 text-gray-800">
                    {primaryPrompt}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {otherPromptVariants.map(([key, value]) => {
                    const text = getPromptByLanguage(value, outputLanguage);

                    return (
                      <div
                        key={key}
                        className="rounded-[20px] border border-black/8 bg-white/86 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-gray-900">
                            {STYLE_LABELS[key]}
                          </div>
                          <CopyButton text={text} />
                        </div>

                        <div className="mt-3 whitespace-pre-line rounded-[16px] bg-gray-50/90 px-4 py-3 text-sm leading-7 text-gray-800">
                          {text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SoftCard>

            <SoftCard>
              <PanelTitle
                title="推荐负面词"
                description="用于规避常见瑕疵与画面失真。"
                action={<CopyButton text={primaryNegativePrompt} />}
              />

              <div className="mt-5 whitespace-pre-line rounded-[20px] bg-gray-50/90 px-4 py-4 text-sm leading-7 text-gray-800">
                {primaryNegativePrompt}
              </div>
            </SoftCard>

            <SoftCard>
              <PanelTitle
                title="平台适配版"
                description="保留当前平台偏好，同时提供其他版本便于对比。"
                action={<CopyButton text={primaryPlatformPrompt} />}
              />

              <div className="mt-5 space-y-4">
                <div className="rounded-[22px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 sm:p-5">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {PLATFORM_LABELS[targetPlatform]}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      当前平台偏好
                    </div>
                  </div>

                  <div className="mt-4 whitespace-pre-line rounded-[18px] bg-gray-50/90 px-4 py-4 text-sm leading-7 text-gray-800">
                    {primaryPlatformPrompt}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {otherPlatformVariants.map(([key, value]) => {
                    const text = getPromptByLanguage(value, outputLanguage);

                    return (
                      <div
                        key={key}
                        className="rounded-[20px] border border-black/8 bg-white/86 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-gray-900">
                            {PLATFORM_LABELS[key]}
                          </div>
                          <CopyButton text={text} />
                        </div>

                        <div className="mt-3 whitespace-pre-line rounded-[16px] bg-gray-50/90 px-4 py-3 text-sm leading-7 text-gray-800">
                          {text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SoftCard>

            <div className="px-1 text-xs leading-6 text-gray-500">
              {result.disclaimer}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}