"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Heart, Camera, Wand2, ChevronRight, Sparkles, Target } from "lucide-react";

// 🚀 全站统一：顶尖 AI 引擎矩阵 (极致富文本版)
const MODELS = [
  { id: "gemini-free", name: "Gemini Flash", badge: "完全免费", logo: "/logos/gemini.png", desc: "快速扫描仪：极速识别图像主体，适合简单画面的批量反推任务。" },
  { id: "deepseek-chat", name: "DeepSeek V3/R1", badge: "国产真神", logo: "/logos/deepseek.png", desc: "深度解析专家：推理能力卓越，能从画面细节中还原创作逻辑。" },
  { id: "moonshot-v1-8k", name: "Kimi 智能助手", badge: "懂国人", logo: "/logos/kimi.png", desc: "语境还原者：擅长分析具有中国风或国内特定文化背景的图像素材。" },
  { id: "doubao-lite-32k", name: "豆包 Doubao", badge: "接地气", logo: "/logos/doubao.png", desc: "日常捕捉者：对生活场景、实拍图的理解非常亲民，反推语气更自然。" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", badge: "多模态霸主", logo: "/logos/gemini.png", desc: "反推绝对首选：谷歌旗舰级多模态能力，反推视频关键帧与运镜细节的王者。" },
  { id: "claude-sonnet-4-6", name: "Claude 4.6 Sonnet", badge: "文案大师", logo: "/logos/claude.png", desc: "艺术风格解析师：对色彩、光影和情绪识别度极高，适合艺术创作反推。" },
  { id: "gpt-5.4", name: "GPT-5.4", badge: "全能六边形", logo: "/logos/OpenAI.png", desc: "工业级参数专家：擅长将图像拆解为专业的 MJ/SD 风格标签与技术参数。" },
];

const PLATFORMS = ["抖音", "小红书", "快手", "B站", "微博", "知乎"];

const getPlatformConfig = (platform: string) => {
  switch (platform) {
    case "抖音":
    case "快手": return { aspect: "aspect-[4/3]", tag: "短视频" };
    case "小红书": return { aspect: "aspect-[4/3]", tag: "图文攻略" };
    case "B站": return { aspect: "aspect-[16/9]", tag: "深度视频" };
    default: return { aspect: "aspect-[21/9]", tag: "热议/问答" };
  }
};

const getGradient = (index: number) => {
  const gradients = [
    "from-zinc-100 to-zinc-50", "from-slate-100 to-gray-50",
    "from-neutral-100 to-zinc-50", "from-stone-100 to-gray-50", "from-gray-100 to-slate-50",
  ];
  return gradients[index % gradients.length];
};

const getPlatformSearchUrl = (platform: string, keyword: string) => {
  const encoded = encodeURIComponent(keyword);
  switch (platform) {
    case "抖音": return `https://www.douyin.com/search/${encoded}`;
    case "小红书": return `https://www.xiaohongshu.com/search_result?keyword=${encoded}`;
    case "快手": return `https://www.kuaishou.com/search/video?searchKey=${encoded}`;
    case "B站": return `https://search.bilibili.com/all?keyword=${encoded}`;
    case "微博": return `https://s.weibo.com/weibo?q=${encoded}`;
    case "知乎": return `https://www.zhihu.com/search?q=${encoded}`;
    default: return `https://www.google.com/search?q=${encoded}`;
  }
};

// 🪄 工具组件：打字机特效
function TypewriterEffect({ text, speed = 15 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState("");
  useEffect(() => {
    let i = 0;
    setDisplayedText("");
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return <span>{displayedText}</span>;
}

// 🪄 工具组件：高级富文本下拉框
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
    <div className="relative" ref={dropdownRef}>
      {/* 默认状态：只显示名字和 Logo，保持顶部控制台的极简 */}
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 bg-transparent text-[13px] font-semibold text-zinc-700 hover:text-black transition-colors outline-none py-1.5 px-3 rounded-full border border-black/10 hover:bg-black/5">
        {selectedOption.logo ? (
          <img src={selectedOption.logo} alt="" className="w-[14px] h-[14px] object-contain shrink-0" />
        ) : (
          <div className="w-[14px] h-[14px] rounded-full bg-zinc-200 flex justify-center items-center text-[8px] shrink-0">
            {selectedOption.name.charAt(0)}
          </div>
        )}
        <span>{selectedOption.name}</span>
        <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 展开状态：超宽富文本列表 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[360px] rounded-2xl bg-white/95 backdrop-blur-2xl shadow-[0_16px_40px_rgb(0,0,0,0.12)] border border-zinc-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[380px] overflow-y-auto custom-scrollbar px-1.5">
            {options.map((opt) => (
              <button
                key={opt.id}
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
                
                {/* 右侧文本区：名字 + 徽章 + 描述 */}
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

// 🪄 工具组件：高级骨架屏
function SkeletonLoader() {
  return (
    <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mt-8 animate-in fade-in duration-500">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col bg-white rounded-[24px] border border-black/[0.04] shadow-sm overflow-hidden h-[280px]">
          <div className="w-full h-[140px] bg-gray-100 animate-pulse"></div>
          <div className="p-5 flex flex-col gap-3">
            <div className="h-4 bg-gray-200 rounded-md w-3/4 animate-pulse"></div>
            <div className="h-3 bg-gray-100 rounded-md w-full animate-pulse"></div>
            <div className="h-3 bg-gray-100 rounded-md w-2/3 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchTestPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"photography" | "creative">("photography");
  const [activeModel, setActiveModel] = useState("gemini-free");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/ai/search-assets", {
        method: "POST",
        body: JSON.stringify({ query, mode, targetModel: activeModel }),
      });
      const json = await res.json();
      setResults(json.data || []);
    } catch (error) {
      console.error("搜索失败", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.MouseEvent, item: any, index: number) => {
    e.stopPropagation();
    e.preventDefault(); 
    setSavingIndex(index);
    try {
      const res = await fetch("/api/user/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: item.title, sourceUrl: item.url, platform: item.platform, description: item.reason }),
      });
      if (res.ok) alert("✨ 已成功收藏");
    } finally {
      setSavingIndex(null);
    }
  };

  const handleCardClick = (e: React.MouseEvent, platform: string, keyword: string, fallbackUrl: string) => {
    e.preventDefault();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      let scheme = "";
      const encoded = encodeURIComponent(keyword);
      switch (platform) {
        case "抖音": scheme = `snssdk1128://search/?keyword=${encoded}`; break;
        case "小红书": scheme = `xhsdiscover://search/result?keyword=${encoded}`; break;
        case "快手": scheme = `kwai://search?keyword=${encoded}`; break;
        case "B站": scheme = `bilibili://search?keyword=${encoded}`; break;
        case "微博": scheme = `sinaweibo://searchall?q=${encoded}`; break;
        case "知乎": scheme = `zhihu://search?q=${encoded}`; break;
      }
      if (scheme) {
        window.location.href = scheme;
        setTimeout(() => window.open(fallbackUrl, "_blank"), 600);
        return;
      }
    }
    window.open(fallbackUrl, "_blank");
  };

  const groupedResults = PLATFORMS.map(platform => ({
    platform, items: results.filter(r => r.platform === platform)
  })).filter(group => group.items.length > 0);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 pb-20 selection:bg-zinc-200">
      
      {/* 🚀 高级悬浮控制台 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-black/5 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          
          <div className="flex items-center gap-3">
             <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">🧠 AI 驱动引擎</span>
             <CustomDropdown options={MODELS} value={activeModel} onChange={setActiveModel} />
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow w-full">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入想了解的产品或话题，AI 将为你规划搜索矩阵..."
                className="w-full h-12 pl-11 pr-4 rounded-[16px] bg-black/[0.03] hover:bg-black/[0.05] focus:bg-white focus:ring-2 focus:ring-black/10 transition-all outline-none text-[15px] font-medium border border-transparent focus:border-black/5"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
            </div>
            
            <div className="flex bg-black/[0.03] p-1 rounded-[14px] shrink-0">
              <button onClick={() => setMode("photography")} className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${mode === "photography" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                <Camera size={14} /> 现场/真实反馈
              </button>
              <button onClick={() => setMode("creative")} className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${mode === "creative" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                <Wand2 size={14} /> 深度/原理解析
              </button>
            </div>
            
            <button onClick={handleSearch} disabled={loading || !query.trim()} className="h-12 px-8 bg-zinc-900 text-white rounded-[14px] text-[15px] font-semibold hover:bg-zinc-800 hover:shadow-md disabled:opacity-50 transition-all active:scale-[0.98] shrink-0">
              {loading ? <span className="animate-pulse">✨ 规划中...</span> : "全网搜"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-10 space-y-16">
        
        {loading ? (
          <SkeletonLoader />
        ) : groupedResults.length > 0 ? (
          groupedResults.map((group, groupIdx) => {
            const config = getPlatformConfig(group.platform);
            const combinedItems = [
              { isRaw: true, title: "直接搜索原词，获取全量结果", searchQuery: query, reason: "探索该平台下关于此词条的基础内容", url: getPlatformSearchUrl(group.platform, query) },
              ...group.items
            ];

            return (
              <div key={groupIdx} className="space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center justify-between pb-3 border-b border-black/5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900">{group.platform}</h2>
                    <span className="text-[11px] font-bold bg-black/[0.04] text-gray-600 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {combinedItems.length} 个搜索矩阵
                    </span>
                  </div>
                </div>

                <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                  {combinedItems.map((item, index) => (
                    <a 
                      key={index} href={item.url} onClick={(e) => handleCardClick(e, group.platform, item.searchQuery, item.url)}
                      className="group flex flex-col bg-white rounded-[24px] border border-black/[0.04] shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_14px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
                    >
                      <div className={`relative w-full flex flex-col justify-center items-center p-6 bg-gradient-to-br ${getGradient(index)} ${config.aspect} border-b border-black/[0.03]`}>
                        {item.isRaw ? <Target className="absolute top-4 left-4 text-black/10" size={24} /> : <Sparkles className="absolute top-4 left-4 text-black/10" size={24} />}
                        <span className={`text-[11px] font-bold tracking-[0.2em] mb-2 uppercase ${item.isRaw ? 'text-gray-600' : 'text-gray-400'}`}>
                          {item.isRaw ? "🎯 原词直达" : "✨ 灵感词"}
                        </span>
                        <h3 className="text-[18px] sm:text-[20px] font-bold text-gray-900 text-center leading-snug group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                          "{item.searchQuery}"
                        </h3>
                      </div>

                      <div className="p-5 flex flex-col flex-grow">
                        <h4 className="font-semibold text-[14px] text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1.5">
                          {item.isRaw ? item.title : <TypewriterEffect text={item.title} speed={10} />}
                        </h4>
                        <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed flex-grow">
                          {item.isRaw ? item.reason : <TypewriterEffect text={item.reason} speed={25} />}
                        </p>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5">
                          <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1">
                            <Search size={12} /> App 内唤醒
                          </span>
                          <div className="flex items-center gap-1">
                             <button onClick={(e) => handleSave(e, item, groupIdx * 100 + index)} className="p-1.5 hover:bg-red-50 rounded-full transition-colors z-10">
                                <Heart size={16} className={`transition-all ${savingIndex === (groupIdx * 100 + index) ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-300 hover:text-red-500'}`} />
                             </button>
                             <div className="p-1.5 text-gray-300 group-hover:text-gray-900 transition-colors"><ChevronRight size={16} /></div>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center pt-32 pb-20 text-gray-400">
            <div className="w-20 h-20 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] flex items-center justify-center mb-6">
              <Wand2 size={28} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">全网灵感搜索矩阵</h3>
            <p className="text-sm font-medium">输入想了解的事物，AI 将为你打通全域高效搜索策略</p>
          </div>
        )}
      </div>
    </div>
  );
}