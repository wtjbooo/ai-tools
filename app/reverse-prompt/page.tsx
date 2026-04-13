"use client";

import GuideAndShowcase from '@/components/GuideAndShowcase';
import Link from "next/link";
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// 1. 商业化模型分层
type AnalyzerModel = 
  | "gemini-free" 
  | "moonshot-v1-8k"
  | "doubao-seed-2-0-lite"
  | "gemini-3.1-pro-preview" 
  | "claude-sonnet-4-6" 
  | "gpt-5.4-mini";
type OutputLanguage = "zh" | "en" | "bilingual";
type OutputStyle = "simple" | "standard" | "pro";

// 2. 扩容的目标生成平台
type TargetPlatform = 
  | "generic" | "midjourney" | "stablediffusion" | "leonardo"
  | "sora" | "runway" | "luma" | "pika" | "jimeng" | "keling" | "doubao";

type AnalysisBlock = { label: string; value: string; };
type PromptText = { zh: string; en: string; };

type ReversePromptResult = {
  summary: AnalysisBlock[];
  cinematography: AnalysisBlock[];
  prompts: Record<OutputStyle, PromptText>;
  negativePrompt: PromptText;
  platformVariants: Record<TargetPlatform, PromptText>;
  disclaimer: string;
};

type PreviewItem = {
  key: string; name: string; size: number; url: string; type: "image" | "video";
};

type TaskMeta = {
  taskId?: string; model?: string; fileCount?: number;
  outputLanguage?: OutputLanguage; outputStyle?: OutputStyle; targetPlatform?: TargetPlatform;
};

type RestoredFile = { name: string; size: number; type?: string; };

const STYLE_LABELS: Record<OutputStyle, string> = {
  simple: "精简版", standard: "标准版", pro: "专业版",
};
const STYLE_OPTIONS = Object.entries(STYLE_LABELS) as Array<[OutputStyle, string]>;

const MODELS = [
  { id: "gemini-free", name: "Gemini Flash", badge: "免费(易拥堵)", logo: "/logos/gemini.png", desc: "快速扫描仪：极速识别图像主体，适合简单画面的批量反推任务。" },
  { id: "moonshot-v1-8k", name: "Kimi 智能助手", badge: "经常缺货", logo: "/logos/kimi.png", desc: "语境还原者：擅长分析具有中国风或国内特定文化背景的图像素材。" },
  { id: "doubao-seed-2-0-lite", name: "豆包 Doubao", badge: "接地气", logo: "/logos/doubao.png", desc: "日常捕捉者：对生活场景、实拍图的理解非常亲民，反推语气更自然。" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", badge: "多模态霸主", logo: "/logos/gemini.png", desc: "反推绝对首选：谷歌旗舰级多模态能力，反推视频关键帧与运镜细节的王者。" },
  { id: "claude-sonnet-4-6", name: "Claude 4.6 Sonnet", badge: "文案大师", logo: "/logos/claude.png", desc: "艺术风格解析师：对色彩、光影和情绪识别度极高，适合艺术创作反推。" },
  { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", badge: "全能六边形", logo: "/logos/OpenAI.png", desc: "工业级参数专家：擅长将图像拆解为专业的 MJ/SD 风格标签与技术参数。" },
];

const PLATFORMS = [
  { id: "generic", name: "通用大模型 (基础描述)", logo: null },
  { id: "midjourney", name: "Midjourney V6", logo: "/logos/Midjourney.png" },
  { id: "stablediffusion", name: "Stable Diffusion", logo: "/logos/Stable Diffusion.png" },
  { id: "leonardo", name: "Leonardo.ai", logo: null }, 
  { id: "sora", name: "Sora (OpenAI 视频)", logo: "/logos/sora.png" },
  { id: "runway", name: "Runway Gen-3 (视频)", logo: "/logos/runway.png" },
  { id: "luma", name: "Luma Dream Machine (视频)", logo: "/logos/luma.png" },
  { id: "pika", name: "Pika Labs (视频)", logo: "/logos/pika.png" },
  { id: "jimeng", name: "即梦 (Jimeng)", logo: "/logos/jimeng.png" },
  { id: "keling", name: "可灵 (Kling)", logo: "/logos/kling.png" },
  { id: "doubao", name: "豆包 (Doubao)", logo: "/logos/doubao.png" },
];

const LANGUAGES = [
  { id: "zh", name: "中文", logo: null },
  { id: "en", name: "English", logo: null },
  { id: "bilingual", name: "中英双语", logo: null },
];

const ACCEPTED_FILE_TYPES = "image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime";
const MAX_FILE_COUNT = 4;
// 🚀 核心升级：有了 R2 云存储撑腰，前端直传限制放大到 200MB！
const MAX_TOTAL_BYTES = 200 * 1024 * 1024; 

function getPromptByLanguage(value: PromptText, language: OutputLanguage) {
  if (!value) return "";
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

function validateFiles(selectedFiles: File[], options?: { requireAtLeastOne?: boolean }) {
  const requireAtLeastOne = options?.requireAtLeastOne ?? true;
  if (requireAtLeastOne && selectedFiles.length === 0) return "请先上传参考图或视频素材";
  if (selectedFiles.length > MAX_FILE_COUNT) return `当前最多支持 ${MAX_FILE_COUNT} 个文件`;
  if (selectedFiles.some((file) => !file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
    return "当前仅支持 JPG/PNG/WEBP 图片 或 MP4/MOV 视频";
  }
  const videoCount = selectedFiles.filter(f => f.type.startsWith("video/")).length;
  if (videoCount > 1) return "每次解析最多支持上传 1 个短视频";
  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) return "总文件体积请控制在 200MB 内"; // 👈 这里的提示也更新了
  return "";
}

function CustomDropdown({ options, value, onChange }: { options: any[], value: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(o => o.id === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)} 
        className="flex w-full items-center justify-between gap-3 bg-white text-[13px] font-semibold text-zinc-700 hover:text-black transition-colors outline-none py-2 px-3.5 rounded-xl sm:rounded-full border border-black/10 hover:bg-black/[0.02] shadow-sm"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedOption.logo ? (
            <img src={selectedOption.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-zinc-200 flex justify-center items-center text-[8px] shrink-0">
              {selectedOption.name.charAt(0)}
            </div>
          )}
          <span className="truncate">{selectedOption.name}</span>
        </div>
        <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[360px] max-w-[90vw] rounded-2xl bg-white/95 backdrop-blur-2xl shadow-[0_16px_40px_rgb(0,0,0,0.12)] border border-zinc-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[380px] overflow-y-auto custom-scrollbar px-1.5">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onChange(opt.id); setIsOpen(false); }}
                className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-colors text-left ${value === opt.id ? 'bg-blue-50/50' : 'hover:bg-zinc-50'}`}
              >
                <div className="shrink-0 mt-0.5">
                  {opt.logo ? (
                    <img src={opt.logo} alt="" className="w-6 h-6 object-contain rounded-full bg-white shadow-sm border border-zinc-100" />
                  ) : (
                     <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-500 border border-zinc-200">
                      {opt.name.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-1 pr-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${value === opt.id ? 'text-blue-700' : 'text-zinc-900'}`}>{opt.name}</span>
                    {opt.badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 shrink-0 border border-zinc-200/60">{opt.badge}</span>}
                  </div>
                  {opt.desc && (
                    <p className={`text-[11.5px] leading-relaxed line-clamp-2 ${value === opt.id ? 'text-blue-600/80' : 'text-zinc-500'}`}>
                      {opt.desc}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PanelTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-[21px] font-semibold tracking-tight text-gray-950 sm:text-[24px]">
          {title}
        </h2>
        {description ? <p className="text-sm leading-6 text-gray-500">{description}</p> : null}
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

function OptionButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm transition-all duration-300",
        active
          ? "border-black bg-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
          : "border-black/10 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-black/15 hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SoftCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={["rounded-[28px] border border-black/8 bg-white/70 backdrop-blur-xl p-5 shadow-[0_10px_32px_rgba(15,23,42,0.04)] sm:p-6", className].join(" ")}>
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

function recordTaskHistory(task: { taskId: string; fileCount: number; firstFileName: string; createdAt: number }) {
  if (typeof window === "undefined") return;
  try {
    const history = JSON.parse(localStorage.getItem("rp_history") || "[]");
    const filtered = history.filter((h: any) => h.taskId !== task.taskId);
    filtered.unshift(task);
    localStorage.setItem("rp_history", JSON.stringify(filtered.slice(0, 50)));
  } catch (e) {}
}

export default function ReversePromptPage() {
  const [analyzerModel, setAnalyzerModel] = useState<AnalyzerModel>("gemini-free");
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("zh");
  const [outputStyle, setOutputStyle] = useState<OutputStyle>("standard");
  const [targetPlatform, setTargetPlatform] = useState<TargetPlatform>("generic");
  const [files, setFiles] = useState<File[]>([]);
  const [restoredFiles, setRestoredFiles] = useState<RestoredFile[]>([]);
  const [result, setResult] = useState<ReversePromptResult | null>(null);
  const [taskMeta, setTaskMeta] = useState<TaskMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(""); // 🚀 新增：展示上传到云端的状态
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState("");
  const [pickerKey, setPickerKey] = useState(0);
  const hasTriedRestore = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [streamedRaw, setStreamedRaw] = useState("");

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
        setError(err instanceof Error ? err.message : "恢复结果失败");
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    }
    void restoreTask();
    return () => { cancelled = true; };
  }, []);

  const primaryPrompt = result?.prompts?.[outputStyle] ? getPromptByLanguage(result.prompts[outputStyle], outputLanguage) : "";
  const primaryNegativePrompt = result?.negativePrompt ? getPromptByLanguage(result.negativePrompt, outputLanguage) : "";
  const primaryPlatformPrompt = result?.platformVariants?.[targetPlatform] ? getPromptByLanguage(result.platformVariants[targetPlatform], outputLanguage) : "";

  function processSelectedFiles(selectedFiles: File[]) {
    if (selectedFiles.length === 0) return;
    const nextError = validateFiles(selectedFiles);

    const hasVideo = selectedFiles.some(f => f.type.startsWith('video/'));
    if (hasVideo && analyzerModel === 'gemini-free') {
        setAnalyzerModel('gemini-3.1-pro-preview'); 
    }

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
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
    setUploadStatus(""); // 重置状态
    setIsRestoring(false);
    setStreamedRaw("");
    setPickerKey((value) => value + 1);
    removeTaskIdFromUrl();
  }

  // 🚀 核心架构重构：前端直传 R2 + 发送云端 FileKey 给后端
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
      setStreamedRaw(""); 
      
      // 自动滚动到加载区域
      window.setTimeout(() => {
        document.getElementById("reverse-prompt-loading")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);

      // ==========================================
      // 第一阶段：直传大文件到 Cloudflare R2
      // ==========================================
      const uploadedFileKeys: string[] = [];
      const isVideo = files.some(f => f.type.startsWith('video/'));

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`正在传输大文件到云端 (${i + 1}/${files.length})...`);
        
        // 1. 向你刚才建的 /api/upload 要临时通行证
        const presignRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type })
        });
        
        if (!presignRes.ok) {
          const errorData = await presignRes.json();
          throw new Error(errorData.error || "无法获取上传通道，请稍后再试");
        }

        const { uploadUrl, fileKey } = await presignRes.json();

        // 2. 绕过 Vercel，直接把大文件塞进 R2
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file
        });

        if (!uploadRes.ok) throw new Error("视频/图片传输至云端失败");
        uploadedFileKeys.push(fileKey);
      }

      // ==========================================
      // 第二阶段：呼叫 AI 后端进行深度反推
      // ==========================================
      setUploadStatus("素材已就绪，AI 视觉引擎深度提取中...");

      // 这里我们将原本发送真文件的逻辑，改成了发送文件在 R2 里的“提取码 (fileKeys)”
      const formData = new FormData();
      formData.append("inputType", isVideo ? "video" : "images");
      formData.append("analyzerModel", analyzerModel);
      formData.append("outputLanguage", outputLanguage);
      formData.append("outputStyle", outputStyle);
      formData.append("targetPlatform", targetPlatform);

      // 把存好大文件的钥匙告诉后端，让后端去 R2 拿
      for (const key of uploadedFileKeys) {
        formData.append("fileKeys", key); 
      }

      const response = await fetch("/api/reverse-prompt", {
        method: "POST",
        body: formData,
      });

      const finalData = await response.json();

      if (!response.ok) {
        throw new Error(finalData.error || "分析失败，请检查模型名称和额度");
      }

      // 组装历史记录元数据
      const pseudoTaskId = `task_${Date.now()}`;
      const nextTaskMeta: TaskMeta = {
        taskId: pseudoTaskId,
        model: analyzerModel,
        fileCount: files.length,
        outputLanguage,
        outputStyle,
        targetPlatform,
      };

      setResult(finalData);
      setTaskMeta(nextTaskMeta);
      setTaskIdToUrl(pseudoTaskId);
      recordTaskHistory({
        taskId: pseudoTaskId,
        fileCount: files.length,
        firstFileName: files[0]?.name || "已归档素材",
        createdAt: Date.now(),
      });

      window.setTimeout(() => {
        document.getElementById("reverse-prompt-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);

    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请稍后再试");
    } finally {
      setIsLoading(false);
      setUploadStatus(""); // 分析结束清空状态
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
                从关键帧反推专业 Prompt
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-gray-600 sm:text-[15px]">
                上传图像或短视频，多模态视觉模型将精准提取主体、运镜与风格，并自动适配国内外主流平台的专业级 Prompt。
              </p>
            </div>
          </div>
        </section>

        <SoftCard>
          <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="space-y-6">
              <PanelTitle title="参数配置" description="配置解析引擎与输出偏好。" />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1 xl:col-span-2 relative z-30">
                  <label className="text-sm font-medium text-gray-900">
                    解析大模型 (Vision Model)
                  </label>
                  <CustomDropdown 
                    options={MODELS} 
                    value={analyzerModel} 
                    onChange={(val) => setAnalyzerModel(val as AnalyzerModel)} 
                  />
                </div>

                <div className="space-y-1.5 relative z-20">
                  <label className="text-sm font-medium text-gray-900">目标生成平台</label>
                  <CustomDropdown 
                    options={PLATFORMS} 
                    value={targetPlatform} 
                    onChange={(val) => setTargetPlatform(val as TargetPlatform)} 
                  />
                </div>

                <div className="space-y-1.5 relative z-10">
                  <label className="text-sm font-medium text-gray-900">输出语言</label>
                  <CustomDropdown 
                    options={LANGUAGES} 
                    value={outputLanguage} 
                    onChange={(val) => setOutputLanguage(val as OutputLanguage)} 
                  />
                </div>
              </div>

              {analyzerModel !== 'gemini-free' && (
                <div className="rounded-[18px] border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-xs leading-6 text-amber-800">
                  👑 你当前选择的是 PRO 级模型，将消耗高级算力。
                </div>
              )}
            </div>

            <div className="space-y-4">
              <PanelTitle title="上传参考素材" description="支持拖拽，可无缝上传最高 200MB 的图片或超清视频。" />

              <div 
                className={`rounded-[24px] border border-dashed transition-all duration-300 p-5 sm:p-6 ${
                  isDragging 
                    ? "border-blue-500 bg-blue-50/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]" 
                    : "border-black/12 bg-[linear-gradient(180deg,rgba(250,250,250,0.72),rgba(255,255,255,0.98))] hover:bg-white"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-4 pointer-events-none">
                  <label className={`flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-[22px] border bg-white px-6 py-8 text-center transition-all duration-300 pointer-events-auto ${
                    isDragging ? "border-blue-200 shadow-sm scale-[1.01]" : "border-black/10 hover:border-black/15 hover:shadow-sm"
                  }`}>
                    <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                      isDragging ? "bg-blue-100 text-blue-600" : "bg-gray-50 text-gray-400"
                    }`}>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>

                    <div className={`text-sm font-medium transition-colors ${isDragging ? "text-blue-600" : "text-gray-900"}`}>
                      {isDragging ? "松手即可上传" : "点击或拖拽上传素材"}
                    </div>
                    <div className="mt-2 text-xs leading-6 text-gray-500">
                      支持 PNG / JPG / MP4 / MOV · 最多 200MB
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
                    <div className="space-y-3 pointer-events-auto">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {previewItems.map((item) => (
                          <div key={item.key} className="relative overflow-hidden rounded-[18px] border border-black/8 bg-white group">
                            <div className="flex aspect-[16/10] items-center justify-center bg-gray-50">
                              {item.url ? (
                                item.type === "video" ? (
                                  <video src={item.url} className="h-full w-full object-cover" muted loop autoPlay playsInline />
                                ) : (
                                  <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                                )
                              ) : (
                                <span className="text-[11px] tracking-widest text-gray-400">ARCHIVED</span>
                              )}
                              {item.type === "video" && (
                                <div className="absolute top-2 right-2 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5 text-[10px] text-white">
                                  VIDEO
                                </div>
                              )}
                            </div>
                            <div className="space-y-1 px-3 py-3">
                              <div className="truncate text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-500">{formatBytes(item.size)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isLoading || isRestoring}
                  className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {/* 🚀 按钮文案会根据上传阶段动态变化 */}
                  {isLoading ? (uploadStatus || "解析计算中...") : isRestoring ? "恢复中..." : "开始反推分析"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isLoading || isRestoring}
                  className="inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm text-gray-700 transition hover:-translate-y-0.5 hover:bg-gray-50 disabled:opacity-60"
                >
                  清空
                </button>
              </div>

              {error && (
                <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          </div>
        </SoftCard>

        {(isLoading || isRestoring) && !result && (
          <SoftCard className="scroll-mt-6" >
            <div id="reverse-prompt-loading">
              <PanelTitle title={isRestoring ? "正在恢复结果" : uploadStatus ? uploadStatus : "AI 视觉引擎深度扫描中..."} description="正在拆解像素与光影关系，请不要离开页面" />
              
              {streamedRaw ? (
                <div className="mt-5 max-h-[300px] overflow-y-auto rounded-[18px] bg-gray-900 px-5 py-4 font-mono text-[13px] text-green-400 shadow-inner custom-scrollbar">
                  <div className="sticky top-0 mb-3 flex items-center gap-2 bg-gray-900/90 py-1 text-xs text-gray-400 backdrop-blur-sm">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    RECEIVING STREAM DATA...
                  </div>
                  <div className="whitespace-pre-wrap break-all opacity-90 leading-relaxed">
                    {streamedRaw}
                    <span className="ml-1 inline-block h-3 w-2 animate-pulse bg-green-400"></span>
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="rounded-[18px] border border-black/8 bg-white/86 p-4">
                      <div className="mt-3 space-y-2">
                        <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-gray-200" />
                        <div className="h-2.5 w-3/5 animate-pulse rounded-full bg-gray-200" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SoftCard>
        )}

        {result && (
          <div id="reverse-prompt-result" className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SoftCard>
              <PanelTitle title="深度结构化拆解" description="大模型提取出的高置信度画面特征与构图关系。" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[...(result.summary || []), ...(result.cinematography || [])].map((item, idx) => (
                  <div key={idx} className="rounded-[18px] border border-black/8 bg-white/86 px-4 py-3.5">
                    <div className="text-xs text-gray-500">{item.label}</div>
                    <div className="mt-1 text-sm leading-7 text-gray-800">{item.value}</div>
                  </div>
                ))}
              </div>
            </SoftCard>

            <SoftCard>
              <PanelTitle
                title="平台专属适配版 (强烈推荐)"
                description={`已针对 [${PLATFORMS.find(p => p.id === targetPlatform)?.name}] 进行底层规则调优。`}
                action={<CopyButton text={primaryPlatformPrompt} />}
              />
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2.5">
                  {PLATFORMS.map((p) => (
                    <OptionButton key={p.id} active={targetPlatform === p.id} onClick={() => setTargetPlatform(p.id as TargetPlatform)}>
                      {p.name.split(' ')[0]}
                    </OptionButton>
                  ))}
                </div>
                <div className="rounded-[22px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 sm:p-5">
                  <div className="whitespace-pre-line rounded-[18px] bg-gray-50/90 px-5 py-5 text-sm leading-7 text-gray-800 border border-black/5 font-mono">
                    {primaryPlatformPrompt}
                  </div>
                </div>
              </div>
            </SoftCard>

            <div className="grid gap-6 sm:grid-cols-2">
              <SoftCard>
                <PanelTitle title="标准提示词库" action={<CopyButton text={primaryPrompt} />} />
                <div className="mt-4 flex flex-wrap gap-2 mb-4">
                  {STYLE_OPTIONS.map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setOutputStyle(key as OutputStyle)}
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
                <PanelTitle title="推荐负面词 (Negative Prompt)" action={<CopyButton text={primaryNegativePrompt} />} />
                <div className="mt-4 whitespace-pre-line rounded-[18px] bg-red-50/50 px-4 py-4 text-[13px] leading-7 text-red-900/80">
                  {primaryNegativePrompt}
                </div>
              </SoftCard>
            </div>
            
            <div className="border-t border-black/10 px-1 pt-4 text-center text-xs leading-6 text-gray-500">
              {result.disclaimer}
            </div>
          </div>
        )}

        <GuideAndShowcase />

      </div>
    </div>
  );
}