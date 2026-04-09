"use client";

import { useState, useEffect, useRef } from "react";

const STYLE_PILLS = ["通用", "🎬 电影质感", "📸 拍立得复古", "🤖 赛博朋克", "🌸 吉卜力动画", "🏛️ 史诗奇幻"];

// 🚀 全站统一：顶尖 AI 引擎矩阵 (极致富文本版)
const MODELS = [
  { 
    id: "gemini-free", 
    name: "Gemini Flash", 
    badge: "完全免费", 
    logo: "/logos/gemini.png",
    desc: "思维敏捷的侦察兵：响应极速，全网通用搜索与基础灵感扩写的最佳入门之选。"
  },
  { 
    id: "deepseek-chat", 
    name: "DeepSeek V3/R1", 
    badge: "国产真神", 
    logo: "/logos/deepseek.png",
    desc: "极致理性的思考者：当前表现最惊艳的国产大模型，逻辑推理与深度解析能力极强。"
  },
  { 
    id: "moonshot-v1-8k", 
    name: "Kimi 智能助手", 
    badge: "懂国人", 
    logo: "/logos/kimi.png",
    desc: "记忆超群的图书管理员：国产之光，极度懂中文语境，擅长长文本与国内平台深度挖掘。"
  },
  { 
    id: "doubao-lite-32k", 
    name: "豆包 Doubao", 
    badge: "接地气", 
    logo: "/logos/doubao.png",
    desc: "平易近人的百事通：极致拟人，适合微博吃瓜、生活常识与小红书日常攻略。"
  },
  { 
    id: "gemini-3.1-pro-preview", 
    name: "Gemini 3.1 Pro", 
    badge: "多模态霸主", 
    logo: "/logos/gemini.png",
    desc: "视觉与视频的王者：谷歌原生旗舰，反推视频关键帧和处理复杂多模态任务的首选。"
  },
  { 
    id: "claude-sonnet-4-6", 
    name: "Claude 4.6 Sonnet", 
    badge: "文案大师", 
    logo: "/logos/claude.png",
    desc: "心思细腻的文科生：共情力极强，擅长小红书/抖音的痛点捕捉、画面扩写与网感爆款。"
  },
  { 
    id: "gpt-5.4", 
    name: "GPT-5.4", 
    badge: "全能六边形", 
    logo: "/logos/OpenAI.png",
    desc: "逻辑严密的理科生：结构化极强，直击要害，Midjourney 硬核提示词与 Google 级深搜必备。"
  },
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

// 🪄 全站统一组件：高级富文本下拉框 (支持双行描述与自适应宽度)
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
      {/* 默认状态：收起时的极简按钮 */}
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

      {/* 展开状态：富文本悬浮面板 (宽度放宽到 360px 以容纳描述文字) */}
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
                {/* 左侧 Logo */}
                <div className="shrink-0 mt-0.5">
                  {opt.logo ? (
                    <img src={opt.logo} alt="" className="w-6 h-6 object-contain rounded-full bg-white shadow-sm border border-zinc-100" />
                  ) : (
                     <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-500 border border-zinc-200">
                      {opt.name.charAt(0)}
                    </div>
                  )}
                </div>
                
                {/* 右侧：名称 + 徽章 + 富文本描述 */}
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