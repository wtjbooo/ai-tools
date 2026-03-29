"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

type PreviewItem = {
  key: string;
  name: string;
  size: number;
  url: string;
};

type TaskMeta = {
  taskId?: string;
  model?: string;
  fileCount?: number;
  outputLanguage?: OutputLanguage;
  outputStyle?: OutputStyle;
  targetPlatform?: TargetPlatform;
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

const STYLE_OPTIONS = Object.entries(STYLE_LABELS) as Array<
  [OutputStyle, string]
>;
const PLATFORM_OPTIONS = Object.entries(PLATFORM_LABELS) as Array<
  [TargetPlatform, string]
>;

const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp";
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

function validateFiles(
  selectedFiles: File[],
  options?: { requireAtLeastOne?: boolean },
) {
  const requireAtLeastOne = options?.requireAtLeastOne ?? true;

  if (requireAtLeastOne && selectedFiles.length === 0) {
    return "请先上传 1～4 张关键帧图片";
  }

  if (selectedFiles.length > MAX_IMAGE_COUNT) {
    return `当前最多支持 ${MAX_IMAGE_COUNT} 张关键帧图片`;
  }

  if (selectedFiles.some((file) => !file.type.startsWith("image/"))) {
    return "当前仅支持 JPG / PNG / WEBP 图片";
  }

  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  if (totalBytes > MAX_TOTAL_BYTES) {
    return "当前总图片体积请控制在 4MB 内";
  }

  return "";
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

function setTaskIdToUrl(taskId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("task", taskId);
  window.history.replaceState({}, "", url.toString());
}

function removeTaskIdFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("task");
  window.history.replaceState({}, "", url.toString());
}

function getTaskIdFromUrl() {
  if (typeof window === "undefined") return "";
  return new URL(window.location.href).searchParams.get("task") || "";
}

export default function ReversePromptPage() {
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("zh");
  const [outputStyle, setOutputStyle] = useState<OutputStyle>("standard");
  const [targetPlatform, setTargetPlatform] =
    useState<TargetPlatform>("generic");
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<ReversePromptResult | null>(null);
  const [taskMeta, setTaskMeta] = useState<TaskMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState("");
  const [pickerKey, setPickerKey] = useState(0);
  const hasTriedRestore = useRef(false);

  const totalBytes = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  );

  const previewItems = useMemo<PreviewItem[]>(
    () =>
      files.map((file) => ({
        key: `${file.name}-${file.lastModified}`,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      previewItems.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previewItems]);

  useEffect(() => {
    if (hasTriedRestore.current) return;
    hasTriedRestore.current = true;

    const taskId = getTaskIdFromUrl();
    if (!taskId) return;

    let cancelled = false;

    async function restoreTask() {
      try {
        setIsRestoring(true);
        setError("");

        const response = await fetch(
          `/api/reverse-prompt?taskId=${encodeURIComponent(taskId)}`,
          {
            method: "GET",
          },
        );

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "恢复结果失败，请稍后再试");
        }

        if (cancelled) return;

        const task = payload?.task ?? {};
        const restoredResult = payload?.result as ReversePromptResult | null;

        if (restoredResult) {
          setResult(restoredResult);
        }

        setTaskMeta({
          taskId: task.id,
          model: task.model,
          fileCount: task.sourceCount,
          outputLanguage: task.outputLanguage,
          outputStyle: task.outputStyle,
          targetPlatform: task.targetPlatform,
        });

        if (
          task.outputLanguage === "zh" ||
          task.outputLanguage === "en" ||
          task.outputLanguage === "bilingual"
        ) {
          setOutputLanguage(task.outputLanguage);
        }

        if (
          task.outputStyle === "simple" ||
          task.outputStyle === "standard" ||
          task.outputStyle === "pro"
        ) {
          setOutputStyle(task.outputStyle);
        }

        if (
          task.targetPlatform === "generic" ||
          task.targetPlatform === "jimeng" ||
          task.targetPlatform === "keling" ||
          task.targetPlatform === "runway" ||
          task.targetPlatform === "pika"
        ) {
          setTargetPlatform(task.targetPlatform);
        }

        window.setTimeout(() => {
          document
            .getElementById("reverse-prompt-result")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "恢复结果失败，请稍后再试");
      } finally {
        if (!cancelled) {
          setIsRestoring(false);
        }
      }
    }

    void restoreTask();

    return () => {
      cancelled = true;
    };
  }, []);

  const primaryPrompt = result
    ? getPromptByLanguage(result.prompts[outputStyle], outputLanguage)
    : "";

  const primaryNegativePrompt = result
    ? getPromptByLanguage(result.negativePrompt, outputLanguage)
    : "";

  const primaryPlatformPrompt = result
    ? getPromptByLanguage(
        result.platformVariants[targetPlatform],
        outputLanguage,
      )
    : "";

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) {
      return;
    }

    const nextError = validateFiles(selectedFiles);

    if (nextError) {
      setFiles([]);
      setResult(null);
      setTaskMeta(null);
      setError(nextError);
      setPickerKey((value) => value + 1);
      removeTaskIdFromUrl();
      return;
    }

    setFiles(selectedFiles);
    setResult(null);
    setTaskMeta(null);
    setError("");
    removeTaskIdFromUrl();
  }

  function resetForm() {
    setFiles([]);
    setResult(null);
    setTaskMeta(null);
    setError("");
    setIsLoading(false);
    setIsRestoring(false);
    setPickerKey((value) => value + 1);
    removeTaskIdFromUrl();
  }

  async function handleAnalyze() {
    const validationError = validateFiles(files);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setResult(null);
      setTaskMeta(null);

      const formData = new FormData();
      formData.append("inputType", "images");
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

      const nextTaskMeta: TaskMeta = {
        taskId: payload?.meta?.taskId,
        model: payload?.meta?.model,
        fileCount: payload?.meta?.fileCount,
        outputLanguage: payload?.meta?.outputLanguage,
        outputStyle: payload?.meta?.outputStyle,
        targetPlatform: payload?.meta?.targetPlatform,
      };

      setResult(payload.result as ReversePromptResult);
      setTaskMeta(nextTaskMeta);

      if (nextTaskMeta.taskId) {
        setTaskIdToUrl(nextTaskMeta.taskId);
      }

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

          <div className="relative max-w-3xl space-y-5">
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

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-[48px] sm:leading-[1.04]">
                从关键帧反推出可复用 Prompt
              </h1>

              <p className="max-w-2xl text-sm leading-7 text-gray-600 sm:text-[15px]">
                上传 1～4 张关键帧，自动拆解主体、场景、镜头语言与风格特征，整理成更适合继续创作的结果。
              </p>
            </div>

            <div className="text-sm text-gray-500">
              1～4 张关键帧 · 中英双语输出 · 平台适配版
            </div>
          </div>
        </section>

        <SoftCard>
          <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="space-y-6">
              <PanelTitle
                title="分析偏好"
                description="先设定输出语言、风格与目标平台。"
              />

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
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

              <div className="text-xs leading-6 text-gray-500">
                结果会尽量保留更稳定、可复用的画面描述，方便继续延展为图像或视频生成 Prompt。
              </div>

              {taskMeta?.taskId ? (
                <div className="rounded-[18px] border border-black/8 bg-gray-50/80 px-4 py-3 text-xs leading-6 text-gray-500">
                  当前结果已保存，可通过当前链接再次打开。任务编号：
                  <span className="ml-1 font-medium text-gray-700">
                    {taskMeta.taskId}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <PanelTitle
                title="上传素材"
                description="优先选择风格稳定、构图明确的关键帧。"
              />

              <div className="rounded-[24px] border border-dashed border-black/12 bg-[linear-gradient(180deg,rgba(250,250,250,0.72),rgba(255,255,255,0.98))] p-5 sm:p-6">
                <div className="space-y-4">
                  <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-black/10 bg-white px-6 py-8 text-center transition hover:border-black/15 hover:bg-gray-50">
                    <div className="text-sm font-medium text-gray-900">
                      点击上传关键帧图片
                    </div>
                    <div className="mt-2 text-xs leading-6 text-gray-500">
                      支持 PNG / JPG / WEBP · 最多 4 张 · 总体积不超过 4MB
                    </div>

                    <input
                      key={pickerKey}
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES}
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {previewItems.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            已选择 {files.length} 张关键帧
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            总大小：{formatBytes(totalBytes)} / 4.00 MB
                          </div>
                        </div>

                        <div className="text-xs leading-5 text-gray-500">
                          {LANGUAGE_LABELS[outputLanguage]} ·{" "}
                          {STYLE_LABELS[outputStyle]} ·{" "}
                          {PLATFORM_LABELS[targetPlatform]}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {previewItems.map((item) => (
                          <div
                            key={item.key}
                            className="overflow-hidden rounded-[18px] border border-black/8 bg-white"
                          >
                            <div className="aspect-[16/10] bg-gray-100">
                              <img
                                src={item.url}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="space-y-1 px-3 py-3">
                              <div className="truncate text-sm font-medium text-gray-900">
                                {item.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatBytes(item.size)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs leading-6 text-gray-500">
                      建议优先选择主体清晰、光线稳定、构图完整的画面。
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isLoading || isRestoring}
                  className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {isLoading
                    ? "分析中..."
                    : isRestoring
                    ? "恢复中..."
                    : "开始分析"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isLoading || isRestoring}
                  className="inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm text-gray-700 transition hover:-translate-y-0.5 hover:border-black/15 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  清空
                </button>
              </div>

              {error ? (
                <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : (
                <div className="text-xs leading-6 text-gray-500">
                  分析结果会根据当前偏好生成，并可继续切换查看不同版本。
                </div>
              )}
            </div>
          </div>
        </SoftCard>

        {isLoading || isRestoring ? (
          <SoftCard>
            <PanelTitle
              title={isRestoring ? "正在恢复结果" : "正在生成结果"}
              description={
                isRestoring
                  ? "正在读取已保存的任务结果。"
                  : "正在解析画面内容、镜头语言与风格特征。"
              }
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                isRestoring ? "正在读取任务信息" : "正在识别主体与场景",
                isRestoring ? "正在恢复分析结果" : "正在整理镜头与风格特征",
                isRestoring ? "正在同步页面状态" : "正在生成 Prompt 与平台适配版",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-black/8 bg-white/86 p-4"
                >
                  <div className="text-sm font-medium text-gray-900">
                    {item}
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-2.5 w-3/5 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </SoftCard>
        ) : null}

        {result ? (
          <div id="reverse-prompt-result" className="space-y-6 sm:space-y-8">
            <SoftCard>
              <PanelTitle
                title="内容拆解"
                description="提取更稳定的主体关系、环境信息与画面结构。"
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
                description="聚焦镜头语言、光线、氛围与整体风格。"
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
                description="按当前风格偏好生成，可直接复制继续使用。"
                action={<CopyButton text={primaryPrompt} />}
              />

              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2.5">
                  {STYLE_OPTIONS.map(([key, label]) => (
                    <OptionButton
                      key={key}
                      active={outputStyle === key}
                      onClick={() => setOutputStyle(key)}
                    >
                      {label}
                    </OptionButton>
                  ))}
                </div>

                <div className="rounded-[22px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {STYLE_LABELS[outputStyle]}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {LANGUAGE_LABELS[outputLanguage]}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">已按当前偏好整理</div>
                  </div>

                  <div className="mt-4 whitespace-pre-line rounded-[18px] bg-gray-50/90 px-4 py-4 text-sm leading-7 text-gray-800">
                    {primaryPrompt}
                  </div>
                </div>
              </div>
            </SoftCard>

            <SoftCard>
              <PanelTitle
                title="推荐负面词"
                description="用于减少常见瑕疵、漂移与多余元素。"
                action={<CopyButton text={primaryNegativePrompt} />}
              />

              <div className="mt-5 whitespace-pre-line rounded-[20px] bg-gray-50/90 px-4 py-4 text-sm leading-7 text-gray-800">
                {primaryNegativePrompt}
              </div>
            </SoftCard>

            <SoftCard>
              <PanelTitle
                title="平台适配版"
                description="按不同平台的常用表达方式整理。"
                action={<CopyButton text={primaryPlatformPrompt} />}
              />

              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2.5">
                  {PLATFORM_OPTIONS.map(([key, label]) => (
                    <OptionButton
                      key={key}
                      active={targetPlatform === key}
                      onClick={() => setTargetPlatform(key)}
                    >
                      {label}
                    </OptionButton>
                  ))}
                </div>

                <div className="rounded-[22px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {PLATFORM_LABELS[targetPlatform]}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        当前平台偏好
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      {LANGUAGE_LABELS[outputLanguage]}
                    </div>
                  </div>

                  <div className="mt-4 whitespace-pre-line rounded-[18px] bg-gray-50/90 px-4 py-4 text-sm leading-7 text-gray-800">
                    {primaryPlatformPrompt}
                  </div>
                </div>
              </div>
            </SoftCard>

            <div className="border-t border-black/10 px-1 pt-4 text-center text-xs leading-6 text-gray-500">
              {result.disclaimer}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}