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

type AnalyzerModel = "gemini" | "gpt4o" | "deepseek";
type OutputLanguage = "zh" | "en" | "bilingual";
type OutputStyle = "simple" | "standard" | "pro";
type TargetPlatform = "generic" | "midjourney" | "jimeng" | "keling" | "runway" | "pika" | "doubao";

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

type RestoredFile = {
  name: string;
  size: number;
};

const STYLE_LABELS: Record<OutputStyle, string> = {
  simple: "精简版",
  standard: "标准版",
  pro: "专业版",
};

const PLATFORM_LABELS: Record<TargetPlatform, string> = {
  generic: "通用版",
  midjourney: "Midjourney",
  jimeng: "即梦",
  keling: "可灵",
  runway: "Runway",
  pika: "Pika",
  doubao: "豆包",
};

const LANGUAGE_LABELS: Record<OutputLanguage, string> = {
  zh: "中文",
  en: "English",
  bilingual: "中英双语",
};

const STYLE_OPTIONS = Object.entries(STYLE_LABELS) as Array<[OutputStyle, string]>;
const PLATFORM_OPTIONS = Object.entries(PLATFORM_LABELS) as Array<[TargetPlatform, string]>;

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

function recordTaskHistory(task: {
  taskId: string;
  fileCount: number;
  firstFileName: string;
  createdAt: number;
}) {
  if (typeof window === "undefined") return;
  try {
    const history = JSON.parse(localStorage.getItem("rp_history") || "[]");
    const filtered = history.filter((h: any) => h.taskId !== task.taskId);
    filtered.unshift(task);
    localStorage.setItem("rp_history", JSON.stringify(filtered.slice(0, 50)));
  } catch (e) {
    // 忽略缓存错误
  }
}

export default function ReversePromptPage() {
  const [analyzerModel, setAnalyzerModel] = useState<AnalyzerModel>("gemini");
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("zh");
  const [outputStyle, setOutputStyle] = useState<OutputStyle>("standard");
  const [targetPlatform, setTargetPlatform] = useState<TargetPlatform>("generic");
  const [files, setFiles] = useState<File[]>([]);
  const [restoredFiles, setRestoredFiles] = useState<RestoredFile[]>([]);
  const [result, setResult] = useState<ReversePromptResult | null>(null);
  const [taskMeta, setTaskMeta] = useState<TaskMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState("");
  const [pickerKey, setPickerKey] = useState(0);
  const hasTriedRestore = useRef(false);

  const displayTotalBytes = useMemo(() => {
    if (files.length > 0) return files.reduce((sum, f) => sum + f.size, 0);
    if (restoredFiles.length > 0)
      return restoredFiles.reduce((sum, f) => sum + f.size, 0);
    return 0;
  }, [files, restoredFiles]);

  const previewItems = useMemo<PreviewItem[]>(() => {
    if (files.length > 0) {
      return files.map((file) => ({
        key: `${file.name}-${file.lastModified}`,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      }));
    }
    if (restoredFiles.length > 0) {
      return restoredFiles.map((file, idx) => ({
        key: `restored-${idx}`,
        name: file.name,
        size: file.size,
        url: "",
      }));
    }
    return [];
  }, [files, restoredFiles]);

  useEffect(() => {
    return () => {
      previewItems.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
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
          { method: "GET" },
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

        if (Array.isArray(task.inputFiles)) {
          setRestoredFiles(task.inputFiles);
        }

        setTaskMeta({
          taskId: task.id,
          model: task.model,
          fileCount: task.sourceCount,
          outputLanguage: task.outputLanguage,
          outputStyle: task.outputStyle,
          targetPlatform: task.targetPlatform,
        });

        if (["zh", "en", "bilingual"].includes(task.outputLanguage)) {
          setOutputLanguage(task.outputLanguage);
        }

        if (["simple", "standard", "pro"].includes(task.outputStyle)) {
          setOutputStyle(task.outputStyle);
        }

        if (["generic", "midjourney", "jimeng", "keling", "runway", "pika", "doubao"].includes(task.targetPlatform)) {
          setTargetPlatform(task.targetPlatform);
        }

        if (task.id) {
          recordTaskHistory({
            taskId: task.id,
            fileCount: task.sourceCount || 0,
            firstFileName:
              Array.isArray(task.inputFiles) && task.inputFiles.length > 0
                ? task.inputFiles[0].name
                : "已归档图片",
            createdAt: task.createdAt
              ? new Date(task.createdAt).getTime()
              : Date.now(),
          });
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
      setRestoredFiles([]);
      setResult(null);
      setTaskMeta(null);
      setError(nextError);
      setPickerKey((value) => value + 1);
      removeTaskIdFromUrl();
      return;
    }

    setFiles(selectedFiles);
    setRestoredFiles([]);
    setResult(null);
    setTaskMeta(null);
    setError("");
    removeTaskIdFromUrl();
  }

  function resetForm() {
    setFiles([]);
    setRestoredFiles([]);
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
      formData.append("analyzerModel", analyzerModel);
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
        recordTaskHistory({
          taskId: nextTaskMeta.taskId,
          fileCount: files.length,
          firstFileName: files[0]?.name || "已归档图片",
          createdAt: Date.now(),
        });
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

              <button
                onClick={() => document.querySelector('.group.inline-flex.h-10')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}
                className="inline-flex items-center rounded-full border border-transparent px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-gray-400 transition hover:border-black/10 hover:bg-white hover:text-gray-700 hover:shadow-sm"
              >
                HISTORY
              </button>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-[48px] sm:leading-[1.04]">
                从关键帧反推专业 Prompt
              </h1>

              <p className="max-w-2xl text-sm leading-7 text-gray-600 sm:text-[15px]">
                上传 1～4 张参考图，强大的多模态视觉模型将为你精准提取主体、运镜与风格，并自动适配国内外主流的图片与视频生成平台。
              </p>
            </div>
          </div>
        </section>

        <SoftCard>
          <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="space-y-6">
              <PanelTitle
                title="参数配置"
                description="配置解析引擎与输出偏好。"
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                  <label className="text-sm font-medium text-gray-900">
                    解析大模型 (Vision Model)
                  </label>
                  <select
                    value={analyzerModel}
                    onChange={(e) => setAnalyzerModel(e.target.value as AnalyzerModel)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-black/20"
                  >
                    <option value="gemini">Gemini 2.5 Flash (系统默认推荐)</option>
                    <option value="deepseek">DeepSeek Vision (需配置 API)</option>
                    <option value="gpt4o">GPT-4o (需配置 API)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-900">
                    目标生成平台
                  </label>
                  <select
                    value={targetPlatform}
                    onChange={(e) =>
                      setTargetPlatform(e.target.value as TargetPlatform)
                    }
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-black/20"
                  >
                    <option value="generic">通用大模型</option>
                    <option value="midjourney">Midjourney (V6)</option>
                    <option value="jimeng">字节 即梦</option>
                    <option value="keling">快手 可灵</option>
                    <option value="doubao">字节 豆包</option>
                    <option value="runway">Runway Gen-3</option>
                    <option value="pika">Pika</option>
                  </select>
                </div>

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
              </div>

              <div className="text-xs leading-6 text-gray-500">
                选择国内平台（如即梦/可灵）会自动优化为本土化表达；选择 Midjourney 会自动加入参数（如 --ar 等）。
              </div>

              {taskMeta?.taskId ? (
                <div className="rounded-[18px] border border-black/8 bg-gray-50/80 px-4 py-3 text-xs leading-6 text-gray-500">
                  当前结果已自动保存到历史记录中。
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <PanelTitle
                title="上传参考图"
                description="支持拖拽，建议选择光线充足、特征明显的图片。"
              />

              <div className="rounded-[24px] border border-dashed border-black/12 bg-[linear-gradient(180deg,rgba(250,250,250,0.72),rgba(255,255,255,0.98))] p-5 sm:p-6 transition-all hover:bg-white">
                <div className="space-y-4">
                  <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-black/10 bg-white px-6 py-8 text-center transition hover:border-black/15 hover:shadow-sm">
                    <div className="text-sm font-medium text-gray-900">
                      点击或拖拽上传图片
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
                            已{files.length > 0 ? "加载" : "归档"}{" "}
                            {files.length || restoredFiles.length} 张图片
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            总计：{formatBytes(displayTotalBytes)}
                          </div>
                        </div>

                        <div className="text-xs leading-5 text-gray-500 font-mono">
                          {MODEL_LABELS?.[analyzerModel as keyof typeof MODEL_LABELS] || "Gemini"}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {previewItems.map((item) => (
                          <div
                            key={item.key}
                            className="overflow-hidden rounded-[18px] border border-black/8 bg-white"
                          >
                            <div className="flex aspect-[16/10] items-center justify-center bg-gray-50">
                              {item.url ? (
                                <img
                                  src={item.url}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-[11px] tracking-widest text-gray-400">
                                  ARCHIVED
                                </span>
                              )}
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
                  ) : null}
                </div>
              </div>

              {/* 【新增】：极简 Apple 风格的高级教学框 */}
              <div className="mt-4 rounded-[20px] bg-blue-50/40 px-5 py-4 border border-blue-100/50">
                <div className="font-medium text-sm mb-2 flex items-center gap-1.5 text-blue-900/90">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  如何截取优质的关键帧？
                </div>
                <ul className="list-disc list-outside ml-4 mt-1.5 space-y-1.5 text-[13px] text-blue-800/70 leading-relaxed">
                  <li><strong className="font-medium text-blue-900/80">主体清晰：</strong>截取人物或核心物体最清晰、无运动模糊的瞬间。</li>
                  <li><strong className="font-medium text-blue-900/80">环境完整：</strong>包含完整的背景（如街景、中式庭院），帮助 AI 理解场景。</li>
                  <li><strong className="font-medium text-blue-900/80">动作变化：</strong>若是反推视频，建议分别截取动作的起始、高潮和结束画面。</li>
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isLoading || isRestoring}
                  className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {isLoading
                    ? "解析模型计算中..."
                    : isRestoring
                    ? "恢复记录中..."
                    : "开始反推分析"}
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
              ) : null}
            </div>
          </div>
        </SoftCard>

        {isLoading || isRestoring ? (
          <SoftCard>
            <PanelTitle
              title={isRestoring ? "正在恢复结果" : "正在生成结果"}
              description={
                isRestoring
                  ? "正在读取云端保存的历史任务数据。"
                  : "多模态视觉模型正在对画面进行结构化扫描与拆解。"
              }
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                isRestoring ? "正在读取任务参数" : "正在识别主体细节与场景景深",
                isRestoring ? "正在恢复分析结果" : "正在提取镜头语言与光线色彩",
                isRestoring ? "正在同步页面状态" : "正在为选定平台适配提示词规则",
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
          <div id="reverse-prompt-result" className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SoftCard>
              <PanelTitle
                title="深度结构化拆解"
                description="大模型提取出的高置信度画面特征与构图关系。"
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
                title="平台专属适配版 (强烈推荐)"
                description={`已根据你的设置专门为 [${PLATFORM_LABELS[targetPlatform]}] 平台进行了参数与语料优化。`}
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

                <div className="rounded-[22px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 sm:p-5 relative group">
                  <div className="mt-2 whitespace-pre-line rounded-[18px] bg-gray-50/90 px-5 py-5 text-sm leading-7 text-gray-800 border border-black/5 selection:bg-black/10">
                    {primaryPlatformPrompt}
                  </div>
                </div>
              </div>
            </SoftCard>

            <div className="grid gap-6 sm:grid-cols-2">
              <SoftCard>
                <PanelTitle
                  title="标准提示词库"
                  description="通用版本的 Prompt，适合自行二次修改。"
                  action={<CopyButton text={primaryPrompt} />}
                />
                <div className="mt-4 flex flex-wrap gap-2 mb-4">
                  {STYLE_OPTIONS.map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setOutputStyle(key)}
                      className={`px-3 py-1 rounded-full text-xs transition ${outputStyle === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="whitespace-pre-line rounded-[18px] bg-gray-50 px-4 py-4 text-[13px] leading-7 text-gray-800">
                  {primaryPrompt}
                </div>
              </SoftCard>

              <SoftCard>
                <PanelTitle
                  title="推荐负面词"
                  description="放入 Negative Prompt 中，规避常见画面瑕疵。"
                  action={<CopyButton text={primaryNegativePrompt} />}
                />
                <div className="mt-4 whitespace-pre-line rounded-[18px] bg-red-50/50 px-4 py-4 text-[13px] leading-7 text-red-900/80">
                  {primaryNegativePrompt}
                </div>
              </SoftCard>
            </div>

            <div className="border-t border-black/10 px-1 pt-4 text-center text-xs leading-6 text-gray-500">
              {result.disclaimer}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const MODEL_LABELS: Record<string, string> = {
  gemini: "Gemini 2.5 Flash",
  gpt4o: "GPT-4o",
  deepseek: "DeepSeek Vision",
};