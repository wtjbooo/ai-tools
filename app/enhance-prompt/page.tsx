"use client";

import { useState, useRef } from "react";
// 🚀 1. 引入全局组件，删掉原本写死在文件里的冗余代码！
import TypewriterEffect from "@/components/TypewriterEffect";
import CustomDropdown from "@/components/CustomDropdown";
// 🚀 2. 引入我们封装的高级请求 Hook
import { useAiTool } from "@/hooks/useAiTool";

const STYLE_PILLS = ["通用", "🎬 电影质感", "📸 拍立得复古", "🤖 赛博朋克", "🌸 吉卜力动画", "🏛️ 史诗奇幻"];

const MODELS = [
  // ⚠️ 提醒：谷歌免费版最近极其不稳定，测试时尽量别选它
  { id: "gemini-free", name: "Gemini Flash", badge: "免费(易拥堵)", logo: "/logos/gemini.png", desc: "快速扫描仪：极速识别图像主体，适合简单画面的批量反推任务。" },
  { id: "deepseek-chat", name: "DeepSeek V3/R1", badge: "国产真神", logo: "/logos/deepseek.png", desc: "深度解析专家：推理能力卓越，能从画面细节中还原创作逻辑。" },
  { id: "moonshot-v1-8k", name: "Kimi 智能助手", badge: "经常缺货", logo: "/logos/kimi.png", desc: "语境还原者：擅长分析具有中国风或国内特定文化背景的图像素材。" },
  // 👇 下面这三个根据你的截图进行了精准修正：
  { id: "doubao-seed-2-0-lite", name: "豆包 Doubao", badge: "接地气", logo: "/logos/doubao.png", desc: "日常捕捉者：对生活场景、实拍图的理解非常亲民，反推语气更自然。" }, //
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", badge: "多模态霸主", logo: "/logos/gemini.png", desc: "反推绝对首选：谷歌旗舰级多模态能力，反推视频关键帧与运镜细节的王者。" }, //
  { id: "claude-sonnet-4-6", name: "Claude 4.6 Sonnet", badge: "文案大师", logo: "/logos/claude.png", desc: "艺术风格解析师：对色彩、光影和情绪识别度极高，适合艺术创作反推。" }, //
  { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", badge: "全能六边形", logo: "/logos/OpenAI.png", desc: "工业级参数专家：擅长将图像拆解为专业的 MJ/SD 风格标签与技术参数。" }, //
];

const PLATFORMS = [
  { id: "通用", name: "通用 (智能匹配)", logo: null },
  { id: "Midjourney", name: "Midjourney (出图)", logo: "/logos/Midjourney.png" },
  { id: "Stable Diffusion", name: "Stable Diffusion (出图)", logo: "/logos/Stable Diffusion.png" },
  { id: "Sora", name: "OpenAI Sora (视频)", logo: "/logos/sora.png" },
  { id: "Runway", name: "Runway Gen-3 (视频)", logo: "/logos/runway.png" },
  { id: "Luma", name: "Luma Dream Machine", logo: "/logos/luma.png" },
  { id: "Pika", name: "Pika Labs (视频)", logo: "/logos/pika.png" },
  { id: "即梦", name: "即梦 Dreamina", logo: "/logos/jimeng.png" },
  { id: "可灵", name: "可灵 Kling (视频)", logo: "/logos/kling.png" },
  { id: "豆包", name: "豆包 Doubao (出图)", logo: "/logos/doubao.png" },
];

export default function EnhancePromptPage() {
  const [input, setInput] = useState("");
  const [activeStyle, setActiveStyle] = useState("通用");
  const [activeModel, setActiveModel] = useState("gemini-free");
  const [activePlatform, setActivePlatform] = useState("通用"); 
  const [validationError, setValidationError] = useState("");
  const [copied, setCopied] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 🚀 3. 一键接管状态！
  const { loading: isLoading, results: result, error: apiError, execute } = useAiTool<{ promptZh?: string; promptEn?: string; negativeEn?: string }>();

  const handleEnhance = () => {
    if (!input.trim()) {
      setValidationError("请输入您脑海中的初步画面~");
      inputRef.current?.focus();
      return;
    }
    setValidationError("");
    setCopied("");
    // 🚀 4. 发起请求变得极其优雅
    execute("/api/enhance-prompt", { 
      text: input, style: activeStyle, targetModel: activeModel, targetPlatform: activePlatform 
    });
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
          
          <div className="px-5 pt-3 pb-2 flex flex-wrap items-center gap-6 border-b border-zinc-100/80 mb-2 relative z-20">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">🧠 AI 引擎</span>
              <CustomDropdown options={MODELS} value={activeModel} onChange={setActiveModel} />
            </div>

            <div className="h-4 w-[1px] bg-zinc-200 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">🎯 目标平台</span>
              <CustomDropdown options={PLATFORMS} value={activePlatform} onChange={setActivePlatform} />
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

        {(validationError || apiError) && (
          <p className="mt-6 text-center text-sm font-medium text-red-500 animate-in fade-in zoom-in-95">
            {validationError || apiError}
          </p>
        )}

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