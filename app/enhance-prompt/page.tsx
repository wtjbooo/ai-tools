"use client";

import { useState, useEffect, useRef } from "react";

const STYLE_PILLS = ["通用", "🎬 电影质感", "📸 拍立得复古", "🤖 赛博朋克", "🌸 吉卜力动画", "🏛️ 史诗奇幻"];

// 🚀 对齐：全网顶尖 AI 商业模型矩阵
const MODELS = [
  { id: "gemini-free", name: "Gemini Flash", badge: "完全免费", logo: "/logos/gemini.png" }, // (待下载)
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", badge: "长视频首选", logo: "/logos/gemini.png" }, // (待下载)
  { id: "claude-sonnet-4-6", name: "Claude 4.6 Sonnet", badge: "艺术感知极佳", logo: "/logos/claude.png" }, // (待下载)
  { id: "gpt-5.4", name: "GPT-5.4", badge: "极速与高智均衡", logo: "/logos/OpenAI.png" }, // 🌟 已经完美匹配你的文件夹
];

// 🚀 对齐：全网顶尖 AI 平台矩阵
const PLATFORMS = [
  { id: "通用", name: "通用 (智能匹配)", logo: null },
  { id: "Midjourney", name: "Midjourney (出图)", logo: "/logos/Midjourney.png" }, // 🌟 匹配了大写 M
  { id: "Stable Diffusion", name: "Stable Diffusion (出图)", logo: "/logos/Stable Diffusion.png" }, // 🌟 匹配了全称和空格
  { id: "Sora", name: "OpenAI Sora (视频)", logo: "/logos/sora.png" }, // (待下载)
  { id: "Runway", name: "Runway Gen-3 (视频)", logo: "/logos/runway.png" }, // 🌟 完美匹配
  { id: "Luma", name: "Luma Dream Machine", logo: "/logos/luma.png" }, // 🌟 完美匹配
  { id: "Pika", name: "Pika Labs (视频)", logo: "/logos/pika.png" }, // (待下载)
  { id: "即梦", name: "即梦 Dreamina", logo: "/logos/jimeng.png" }, // 🌟 完美匹配
  { id: "可灵", name: "可灵 Kling (视频)", logo: "/logos/kling.png" }, // 🌟 完美匹配
  { id: "豆包", name: "豆包 Doubao (出图)", logo: "/logos/doubao.png" }, // 🌟 完美匹配
];

// --- 工具组件：打字机 ---
function TypewriterEffect({ text, speed = 15 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState("");
  useEffect(() => {
    let i = 0;
    setDisplayedText("");
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return <span>{displayedText}</span>;
}

// 🚀 高级组件：纯手搓 Apple 级带图片下拉菜单
function CustomDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder 
}: { 
  options: any[], 
  value: string, 
  onChange: (val: string) => void,
  placeholder: string 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(o => o.id === value) || options[0];

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-transparent text-sm font-medium text-zinc-800 hover:text-blue-600 transition-colors py-1 outline-none"
      >
        {selectedOption.logo ? (
          <img src={selectedOption.logo} alt={selectedOption.name} className="w-4 h-4 object-contain rounded-full bg-zinc-100 shrink-0" />
        ) : (
          <div className="w-4 h-4 rounded-full bg-zinc-200 flex items-center justify-center text-[8px] text-zinc-500 font-bold border border-zinc-300 shrink-0">
            {selectedOption.name.charAt(0)}
          </div>
        )}
        <span>{selectedOption.name}</span>
        <svg className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 🌟 核心修复：将 w-56 改为 w-[280px]，让悬浮框足够宽容纳所有文字 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[280px] rounded-2xl bg-white/95 backdrop-blur-2xl shadow-[0_12px_40px_rgb(0,0,0,0.12)] border border-zinc-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-64 overflow-y-auto custom-scrollbar px-1">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-colors ${
                  value === opt.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                {opt.logo ? (
                  <img src={opt.logo} alt={opt.name} className="w-5 h-5 object-contain rounded-full bg-white shadow-sm shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-500 border border-zinc-200 shrink-0">
                    {opt.name.charAt(0)}
                  </div>
                )}
                {/* 文字占满剩余空间，不再提前被截断 */}
                <span className="truncate flex-1 text-left">{opt.name}</span>
                {/* 🌟 核心修复：添加 shrink-0 保护右侧角标不被挤压 */}
                {opt.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 shrink-0">{opt.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- 页面主体 ---
export default function EnhancePromptPage() {
  const [input, setInput] = useState("");
  const [activeStyle, setActiveStyle] = useState("通用");
  const [activeModel, setActiveModel] = useState("gemini-free");
  const [activePlatform, setActivePlatform] = useState("通用"); 
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ promptZh?: string; promptEn?: string; negativeEn?: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleEnhance = async () => {
    if (!input.trim()) {
      setError("请输入您脑海中的初步画面~");
      inputRef.current?.focus();
      return;
    }

    setError("");
    setIsLoading(true);
    setResult(null);
    setCopied("");

    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: input, style: activeStyle, targetModel: activeModel, targetPlatform: activePlatform 
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "魔法中断了，请稍后重试");
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "请求出错了");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, blockName: string) => {
    navigator.clipboard.writeText(text);
    setCopied(blockName);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-16 sm:px-6 lg:px-8 font-sans selection:bg-zinc-200">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl mb-4">
            灵感魔法棒 ✨
          </h1>
          <p className="text-zinc-500 text-lg">输入只言片语，一键扩写为全网顶尖 AI 的专业提示词。</p>
        </div>

        <div className="group rounded-[24px] border border-black/5 bg-white/80 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.08)] focus-within:border-black/10">
          
          {/* 顶栏控制区：替换为高级自定义组件 */}
          <div className="px-5 pt-3 pb-2 flex flex-wrap items-center gap-6 border-b border-zinc-100/80 mb-2 relative z-20">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">🧠 AI 引擎</span>
              <CustomDropdown options={MODELS} value={activeModel} onChange={setActiveModel} placeholder="选择模型" />
            </div>

            <div className="h-4 w-[1px] bg-zinc-200 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">🎯 目标平台</span>
              <CustomDropdown options={PLATFORMS} value={activePlatform} onChange={setActivePlatform} placeholder="选择平台" />
            </div>
          </div>

          <div className="relative z-10">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="描述你的画面，例如：一只正在喝咖啡的猫..."
              className="w-full resize-none border-0 bg-transparent px-5 py-4 text-lg text-zinc-900 placeholder:text-zinc-400 focus:ring-0 outline-none"
              rows={4}
            />
          </div>
          
          <div className="px-4 pb-4 flex flex-wrap gap-2 relative z-10">
            {STYLE_PILLS.map((pill) => (
              <button
                key={pill}
                onClick={() => setActiveStyle(pill)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                  activeStyle === pill ? "bg-zinc-900 text-white shadow-md" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {pill}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-black/5 px-5 py-4 relative z-10">
            <span className="text-xs font-medium text-zinc-400">{input.length} / 500</span>
            <button
              onClick={handleEnhance}
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center justify-center rounded-[16px] bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.96] shadow-md hover:shadow-lg"
            >
              {isLoading ? <span className="animate-pulse">✨ 施展魔法中...</span> : "🪄 一键扩写"}
            </button>
          </div>
        </div>

        {error && <p className="mt-6 text-center text-sm font-medium text-red-500 animate-in fade-in zoom-in-95">{error}</p>}

        {result && (
          <div className="mt-10 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-0">
            <div className="group rounded-[20px] border border-zinc-100 bg-white p-6 shadow-sm hover:border-zinc-200 transition-all">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  中文 Prompt (国内平台)
                </h3>
                <button onClick={() => handleCopy(result.promptZh || "", "zh")} className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors">
                  {copied === "zh" ? <span className="text-green-600">✓ 已复制</span> : "复制中文"}
                </button>
              </div>
              <p className="text-base leading-relaxed text-zinc-700 selection:bg-blue-100">
                <TypewriterEffect text={result.promptZh || ""} speed={20} />
              </p>
            </div>

            <div className="group relative rounded-[20px] border border-zinc-200 bg-zinc-50 p-6 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-800">🪄 英文 Prompt (国外平台)</h3>
                <button onClick={() => handleCopy(result.promptEn || "", "en")} className="flex items-center space-x-1 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-inset ring-zinc-200 transition-all hover:bg-zinc-100 hover:scale-105 active:scale-95">
                  {copied === "en" ? <span className="text-green-600">✓ 已复制</span> : <span>复制英文</span>}
                </button>
              </div>
              <p className="font-mono text-sm leading-relaxed text-zinc-800 selection:bg-zinc-200">
                <TypewriterEffect text={result.promptEn || ""} speed={10} />
              </p>
            </div>

            {result.negativeEn && (
              <div className="rounded-[16px] border border-red-100 bg-red-50/50 p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-red-500">🚫 负面提示词 (规避缺陷)</h3>
                  <button onClick={() => handleCopy(result.negativeEn || "", "neg")} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                    {copied === "neg" ? "已复制" : "复制"}
                  </button>
                </div>
                <p className="font-mono text-xs leading-relaxed text-red-700/80">{result.negativeEn}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}