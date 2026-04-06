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

// 1. 扩展最新的顶级模型库
type AnalyzerModel = "gpt-5.4" | "claude-sonnet-4-6" | "gemini-3.1-pro-preview" | "deepseek";
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

// 2. 预览类型新增 video 区分
type PreviewItem = {
  key: string;
  name: string;
  size: number;
  url: string;
  type: "image" | "video";
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
  type?: string;
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

// 更新前台展示的模型名称，保持极简专业
const MODEL_LABELS: Record<AnalyzerModel, string> = {
  "gpt-5.4": "GPT-5.4 (高速且均衡)",
  "claude-sonnet-4-6": "Claude 4.6 Sonnet (艺术解析极佳)",
  "gemini-3.1-pro-preview": "Gemini 3.1 Pro (视频/长图首选)",
  "deepseek": "DeepSeek Vision",
};

const STYLE_OPTIONS = Object.entries(STYLE_LABELS) as Array<[OutputStyle, string]>;
const PLATFORM_OPTIONS = Object.entries(PLATFORM_LABELS) as Array<[TargetPlatform, string]>;

// 3. 扩充文件类型与体积上限 (支持短视频)
const ACCEPTED_FILE_TYPES = "image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime";
const MAX_FILE_COUNT = 4;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 提升至 50MB 适配视频

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

function isVideoFile(file: File | RestoredFile) {
  if ("type" in file && file.type) {
    return file.type.startsWith("video/");
  }
  return /\.(mp4|webm|mov)$/i.test(file.name);
}

function validateFiles(
  selectedFiles: File[],
  options?: { requireAtLeastOne?: boolean },
) {
  const requireAtLeastOne = options?.requireAtLeastOne ?? true;

  if (requireAtLeastOne && selectedFiles.length === 0) {
    return "请上传参考图或视频素材";
  }

  if (selectedFiles.length > MAX_FILE_COUNT) {
    return `当前最多支持 ${MAX_FILE_COUNT} 个文件`;
  }

  const hasInvalidType = selectedFiles.some(
    (file) => !file.type.startsWith("image/") && !file.type.startsWith("video/")
  );
  if (hasInvalidType) {
    return "仅支持 JPG / PNG / WEBP 图片或 MP4 / MOV 短视频";
  }

  const videoCount = selectedFiles.filter(f => f.type.startsWith("video/")).length;
  if (videoCount > 1) {
    return "为保证解析深度，每次最多仅支持解析 1 个视频";
  }

  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return "请将总文件体积控制在 50MB 内";
  }

  return "";
}

// 4. 组件全面套用 Apple 极简毛玻璃风格
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1.5">
        <h2 className="text-[20px] font-medium tracking-tight text-gray-900 sm:text-[22px]">
          {title}
        </h2>
        {description ? (
          <p className="text-[13px] leading-relaxed text-gray-500">{description}</p>
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
      window.alert("复制失败，请手动复制");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center rounded-full border border-black/5 bg-white/80 backdrop-blur-sm px-3.5 py-1.5 text-[12px] font-medium text-gray-700 shadow-sm transition hover:scale-105 hover:border-black/10 hover:bg-gray-50"
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
        "rounded-full border px-4 py-2 text-[13px] transition-all duration-300",
        active
          ? "border-transparent bg-gray-900 text-white shadow-md"
          : "border-black/5 bg-gray-50/50 text-gray-600 hover:bg-gray-100/80 hover:text-gray-900",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// 核心容器：极致的毛玻璃与弥散阴影
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
        "rounded-[24px] border border-black/5 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] sm:p-8",
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
  } catch (e) {}
}

export default function ReversePromptPage() {
  // 默认模型设为高速且全能的 GPT-5.4
  const [analyzerModel, setAnalyzerModel] = useState<AnalyzerModel>("gpt-5.4");
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
  const [isDragging, setIsDragging] = useState(false);

  const displayTotalBytes = useMemo(() => {
    if (files.length > 0) return files.reduce((sum, f) => sum + f.size, 0);
    if (restoredFiles.length > 0) return restoredFiles.reduce((sum, f) => sum + f.size, 0);
    return 0;
  }, [files, restoredFiles]);

  const previewItems = useMemo<PreviewItem[]>(() => {
    if (files.length > 0) {
      return files.map((file) => ({
        key: `${file.name}-${file.lastModified}`,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        type: isVideoFile(file) ? "video" : "image",
      }));
    }
    if (restoredFiles.length > 0) {
      return restoredFiles.map((file, idx) => ({
        key: `restored-${idx}`,
        name: file.name,
        size: file.size,
        url: "",
        type: isVideoFile(file) ? "video" : "image",
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
        const response = await fetch(`/api/reverse-prompt?taskId=${encodeURIComponent(taskId)}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "恢复失败");
        if (cancelled) return;

        const task = payload?.task ?? {};
        if (payload?.result) setResult(payload.result as ReversePromptResult);
        if (Array.isArray(task.inputFiles)) setRestoredFiles(task.inputFiles);

        setTaskMeta({
          taskId: task.id,
          model: task.model,
          fileCount: task.sourceCount,
          outputLanguage: task.outputLanguage,
          outputStyle: task.outputStyle,
          targetPlatform: task.targetPlatform,
        });

        if (task.outputLanguage) setOutputLanguage(task.outputLanguage);
        if (task.outputStyle) setOutputStyle(task.outputStyle);
        if (task.targetPlatform) setTargetPlatform(task.targetPlatform);

        window.setTimeout(() => {
          document.getElementById("reverse-prompt-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "恢复失败");
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    }
    void restoreTask();
    return () => { cancelled = true; };
  }, []);

  const primaryPrompt = result ? getPromptByLanguage(result.prompts[outputStyle], outputLanguage) : "";
  const primaryNegativePrompt = result ? getPromptByLanguage(result.negativePrompt, outputLanguage) : "";
  const primaryPlatformPrompt = result ? getPromptByLanguage(result.platformVariants[targetPlatform], outputLanguage) : "";

  function processSelectedFiles(selectedFiles: File[]) {
    if (selectedFiles.length === 0) return;
    const nextError = validateFiles(selectedFiles);

    // 智能引擎切换：如果是视频，自动切换到 Gemini 3.1 Pro
    const hasVideo = selectedFiles.some(f => f.type.startsWith('video/'));
    if (hasVideo && analyzerModel !== 'gemini-3.1-pro-preview') {
        setAnalyzerModel('gemini-3.1-pro-preview'); 
    }

    if (nextError) {
      setError(nextError);
      return;
    }

    setFiles(selectedFiles);
    setRestoredFiles([]);
    setResult(null);
    setTaskMeta(null);
    setError("");
    removeTaskIdFromUrl();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    processSelectedFiles(Array.from(event.target.files || []));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  }

  function resetForm() {
    setFiles([]);
    setRestoredFiles([]);
    setResult(null);
    setTaskMeta(null);
    setError("");
    setIsLoading(false);
    setIsRestoring(false);
    setPickerKey((v) => v + 1);
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
      const isVideo = files.some(f => f.type.startsWith('video/'));
      formData.append("inputType", isVideo ? "video" : "images");
      formData.append("analyzerModel", analyzerModel);
      formData.append("outputLanguage", outputLanguage);
      formData.append("outputStyle", outputStyle);
      formData.append("targetPlatform", targetPlatform);

      files.forEach(file => formData.append("files", file));

      // 即将对接的后端接口路径
      const response = await fetch("/api/reverse-prompt", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "分析失败，请检查网络设置");

      setResult(payload.result as ReversePromptResult);
      if (payload?.meta?.taskId) {
        setTaskIdToUrl(payload.meta.taskId);
        recordTaskHistory({
          taskId: payload.meta.taskId,
          fileCount: files.length,
          firstFileName: files[0]?.name || "已归档素材",
          createdAt: Date.now(),
        });
      }

      window.setTimeout(() => {
        document.getElementById("reverse-prompt-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请检查网络设置");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 bg-gray-50/30 min-h-screen">
      <div className="space-y-6 sm:space-y-8">
        
        {/* 全局去除了重色的背景渐变，改为原生呼吸感留白 */}
        <section className="relative px-2 py-4 sm:px-4 sm:py-6">
          <div className="relative max-w-3xl space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center rounded-full bg-white px-4 py-2 text-[13px] font-medium text-gray-600 shadow-sm ring-1 ring-black/5 transition hover:scale-105 hover:text-gray-900"
              >
                ← 返回
              </Link>
              <span className="inline-flex items-center rounded-full bg-gray-100/80 px-3 py-1.5 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                AI Reverse Prompt
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-medium tracking-tight text-gray-900 sm:text-[42px] sm:leading-tight">
                解构视觉，重塑灵感。
              </h1>
              <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
                上传关键帧或短视频，多模态视觉模型将精准提取主体、运镜与风格，为你自动生成适用于各大 AI 平台的专业级 Prompt。
              </p>
            </div>
          </div>
        </section>

        <SoftCard>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-8">
              <PanelTitle
                title="引擎配置"
                description="选择最适合当前任务的解析大脑与目标平台。"
              />

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-gray-700">多模态解析模型</label>
                  <select
                    value={analyzerModel}
                    onChange={(e) => setAnalyzerModel(e.target.value as AnalyzerModel)}
                    className="w-full appearance-none rounded-[16px] border border-black/5 bg-gray-50/50 px-4 py-3 text-[14px] text-gray-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-black/10 focus:border-transparent"
                  >
                    {Object.entries(MODEL_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-gray-700">目标生成平台</label>
                  <select
                    value={targetPlatform}
                    onChange={(e) => setTargetPlatform(e.target.value as TargetPlatform)}
                    className="w-full appearance-none rounded-[16px] border border-black/5 bg-gray-50/50 px-4 py-3 text-[14px] text-gray-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-black/10 focus:border-transparent"
                  >
                    {PLATFORM_OPTIONS.map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-gray-700">输出语言</label>
                  <select
                    value={outputLanguage}
                    onChange={(e) => setOutputLanguage(e.target.value as OutputLanguage)}
                    className="w-full appearance-none rounded-[16px] border border-black/5 bg-gray-50/50 px-4 py-3 text-[14px] text-gray-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-black/10 focus:border-transparent"
                  >
                    <option value="zh">中文</option>
                    <option value="en">English</option>
                    <option value="bilingual">中英双语</option>
                  </select>
                </div>
              </div>

              {analyzerModel === 'gemini-3.1-pro-preview' && (
                <div className="rounded-[16px] bg-blue-50/30 px-4 py-3 text-[13px] leading-relaxed text-blue-800/80 border border-blue-100/50">
                  <span className="mr-1.5">🎬</span> 
                  已开启 Gemini 3.1 Pro，目前专攻视频长流解析，支持复杂物理运镜拆解。
                </div>
              )}
              {analyzerModel === 'claude-sonnet-4-6' && (
                <div className="rounded-[16px] bg-purple-50/30 px-4 py-3 text-[13px] leading-relaxed text-purple-800/80 border border-purple-100/50">
                  <span className="mr-1.5">🎨</span> 
                  已开启 Claude 4.6 Sonnet，极其擅长艺术风格捕捉与人文情绪表达。
                </div>
              )}
            </div>

            <div className="space-y-6">
              <PanelTitle
                title="视觉素材"
                description="支持拖拽。最高 4 张图片或 1 段视频 (50MB内)。"
              />

              <div 
                className={`relative overflow-hidden rounded-[24px] border transition-all duration-300 p-2 ${
                  isDragging 
                    ? "border-black/20 bg-gray-50 scale-[1.01]" 
                    : "border-black/5 bg-white hover:border-black/10"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-4 pointer-events-none p-4 sm:p-6">
                  <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center text-center pointer-events-auto">
                    <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                      isDragging ? "bg-black text-white" : "bg-gray-50 text-gray-400"
                    }`}>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <div className="text-[15px] font-medium text-gray-900">
                      {isDragging ? "松手即可解析" : "点击或拖拽上传素材"}
                    </div>
                    <div className="mt-2 text-[13px] text-gray-400">
                      支持 JPG / PNG / MP4 / MOV · 最高 50MB
                    </div>

                    <input
                      key={pickerKey}
                      type="file"
                      accept={ACCEPTED_FILE_TYPES}
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {previewItems.length > 0 && (
                    <div className="mt-4 border-t border-black/5 pt-4 pointer-events-auto">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {previewItems.map((item) => (
                          <div key={item.key} className="group relative overflow-hidden rounded-[16px] bg-gray-50 border border-black/5 shadow-sm">
                            <div className="flex aspect-video items-center justify-center overflow-hidden">
                              {item.url ? (
                                item.type === "video" ? (
                                  <video src={item.url} className="h-full w-full object-cover" muted loop playsInline autoPlay />
                                ) : (
                                  <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                                )
                              ) : (
                                <span className="text-[11px] tracking-widest text-gray-400">ARCHIVED</span>
                              )}
                              {/* 高级质感视频标识 */}
                              {item.type === "video" && (
                                <div className="absolute top-2.5 right-2.5 rounded-full bg-white/20 backdrop-blur-md px-2 py-1 text-[10px] font-medium tracking-wide text-white border border-white/20 shadow-sm">
                                  VIDEO
                                </div>
                              )}
                            </div>
                            <div className="px-3 py-2.5 bg-white">
                              <div className="truncate text-[13px] font-medium text-gray-900">{item.name}</div>
                              <div className="text-[11px] text-gray-500">{formatBytes(item.size)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isLoading || isRestoring}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-gray-900 px-6 text-[14px] font-medium text-white shadow-md transition-transform hover:scale-105 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isLoading ? "解析流计算中..." : isRestoring ? "读取中..." : "启动深度反推"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isLoading || isRestoring}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-white border border-black/5 px-6 text-[14px] font-medium text-gray-600 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  清空
                </button>
              </div>

              {error && (
                <div className="rounded-[16px] bg-red-50/50 px-4 py-3 text-[13px] text-red-600 border border-red-100/50">
                  {error}
                </div>
              )}
            </div>
          </div>
        </SoftCard>

        {(isLoading || isRestoring) && (
          <SoftCard className="animate-pulse">
            <PanelTitle title={isRestoring ? "同步历史中..." : "视神经拆解进行中..."} />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-[16px] border border-black/5 bg-gray-50/50 p-5 space-y-3">
                  <div className="h-2 w-1/3 rounded-full bg-gray-200" />
                  <div className="h-2 w-4/5 rounded-full bg-gray-200" />
                  <div className="h-2 w-2/3 rounded-full bg-gray-200" />
                </div>
              ))}
            </div>
          </SoftCard>
        )}

        {result && (
          <div id="reverse-prompt-result" className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <SoftCard>
              <PanelTitle title="画面结构体" description="语义化提取的视觉维度。" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...result.summary, ...result.cinematography].map((item, idx) => (
                  <div key={idx} className="rounded-[16px] border border-black/5 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-black/10">
                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</div>
                    <div className="mt-1.5 text-[14px] leading-relaxed text-gray-800">{item.value}</div>
                  </div>
                ))}
              </div>
            </SoftCard>

            <SoftCard className="border-black/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
              <PanelTitle
                title="平台专属原生 Prompt"
                description={`已针对 ${PLATFORM_LABELS[targetPlatform]} 底层模型完成调优。`}
                action={<CopyButton text={primaryPlatformPrompt} />}
              />
              <div className="mt-6 space-y-5">
                <div className="flex flex-wrap gap-2.5">
                  {PLATFORM_OPTIONS.map(([key, label]) => (
                    <OptionButton key={key} active={targetPlatform === key} onClick={() => setTargetPlatform(key)}>
                      {label}
                    </OptionButton>
                  ))}
                </div>
                <div className="rounded-[20px] bg-gray-50 p-5 border border-black/5">
                  <div className="whitespace-pre-line text-[14px] leading-relaxed text-gray-900 font-mono selection:bg-black/10">
                    {primaryPlatformPrompt}
                  </div>
                </div>
              </div>
            </SoftCard>

            <div className="grid gap-6 sm:grid-cols-2">
              <SoftCard>
                <PanelTitle
                  title="标准描述库"
                  description="适用于基础二创与调优。"
                  action={<CopyButton text={primaryPrompt} />}
                />
                <div className="mt-4 flex flex-wrap gap-2 mb-4">
                  {STYLE_OPTIONS.map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setOutputStyle(key)}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition ${outputStyle === key ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-50 text-gray-500 border border-black/5 hover:bg-gray-100'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="whitespace-pre-line rounded-[18px] bg-gray-50 px-5 py-4 text-[13px] leading-relaxed text-gray-800 border border-black/5">
                  {primaryPrompt}
                </div>
              </SoftCard>

              <SoftCard>
                <PanelTitle
                  title="推荐 Negative Prompt"
                  description="规避对应风格的常见瑕疵。"
                  action={<CopyButton text={primaryNegativePrompt} />}
                />
                <div className="mt-4 whitespace-pre-line rounded-[18px] bg-red-50/30 px-5 py-4 text-[13px] leading-relaxed text-red-900/80 border border-red-100/50">
                  {primaryNegativePrompt}
                </div>
              </SoftCard>
            </div>

            <div className="px-2 pt-2 text-center text-[12px] text-gray-400">
              {result.disclaimer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}