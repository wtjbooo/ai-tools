"use client";

import { useState, useEffect } from "react";
import { Search, Heart, Camera, Wand2, ChevronRight, Sparkles, Target, Bot } from "lucide-react";
import TypewriterEffect from "@/components/TypewriterEffect";
import SkeletonLoader from "@/components/SkeletonLoader";
import CustomDropdown from "@/components/CustomDropdown";
import { useAiTool } from "@/hooks/useAiTool";
import { useUpgradeModal } from "@/contexts/UpgradeModalContext";
import { getModelCost } from "@/lib/pricing";

const MODELS = [
  { id: "gemini-free", name: "Gemini Flash", badge: "完全免费", logo: "/logos/gemini.png", desc: "全网情报侦察兵：极速响应，适合处理基础资料搜索。" },
  { id: "deepseek-chat", name: "DeepSeek V3/R1", badge: "国产真神", logo: "/logos/deepseek.png", desc: "逻辑深挖理科生：结构化思维极强，适合硬核解析词。" },
  { id: "moonshot-v1-8k", name: "Kimi 智能助手", badge: "懂国人", logo: "/logos/kimi.png", desc: "图书管理员：擅长挖掘知乎、豆瓣长尾内容。" },
  { id: "doubao-lite-32k", name: "豆包 Doubao", badge: "接地气", logo: "/logos/doubao.png", desc: "接地气百事通：懂普通人习惯，适合微博、小红书。" },
  { id: "claude-sonnet-4-6", name: "Claude 4.6", badge: "文案大师", logo: "/logos/claude.png", desc: "捕捉痛点的文科生：生成极具点击欲望的爆款灵感词。" },
  { id: "gpt-5.4", name: "GPT-5.4", badge: "全能六边形", logo: "/logos/OpenAI.png", desc: "全能搜索顾问：逻辑严密，处理跨平台矩阵规划。" },
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
  const gradients = ["from-zinc-50 to-white", "from-slate-50 to-white", "from-neutral-50 to-white"];
  return gradients[index % gradients.length];
};

export default function SearchTestPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"photography" | "creative">("photography");
  const [activeModel, setActiveModel] = useState("gemini-free");
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  // 🚀 新增：用于存放历史记录回显的数据
  const [recoveredResult, setRecoveredResult] = useState<{ analysis: string; items: any[] } | null>(null);

  const { openModal } = useUpgradeModal();
  const { loading, results, error, execute } = useAiTool<any>(); 

  const currentCost = getModelCost(activeModel, 'text');

  // 🚀 新增：一进页面，如果有 task ID，立刻去“读档”
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("task");
    if (taskId) {
      fetch(`/api/get-record?taskId=${taskId}`)
        .then(res => res.json())
        .then(json => {
          if (json.success && json.data) {
            const record = json.data;
            if (record.originalInput) setQuery(record.originalInput);
            if (record.resultJson) {
              try {
                setRecoveredResult(JSON.parse(record.resultJson));
              } catch (e) {
                console.error("解析搜索记录失败:", e);
              }
            }
          }
        })
        .catch(err => console.error("读取历史数据异常:", err));
    }
  }, []);

  useEffect(() => {
    if (error && (error.includes("次数") || error.includes("已用完") || error.includes("额度"))) {
      openModal();
    }
  }, [error, openModal]);

  const handleSearch = () => {
    if (!query.trim()) return;
    setRecoveredResult(null); // 🚀 清空老记录，准备获取新数据
    execute("/api/ai/search-assets", { query, mode, targetModel: activeModel });
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
    window.open(fallbackUrl, "_blank");
  };

  // 🚀 核心：优先使用历史数据，如果没有历史数据再用新生成的数据
  const finalResult = recoveredResult || results;
  const safeItems = finalResult?.items || [];
  const aiAnalysisText = finalResult?.analysis || "";
  
  const groupedResults = PLATFORMS.map(platform => ({
    platform, items: safeItems.filter((r: any) => r.platform === platform)
  })).filter(group => group.items.length > 0);

  const hasSearched = loading || safeItems.length > 0;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-gray-900 pb-20 selection:bg-blue-100 font-sans transition-all duration-700">
      
      {/* 顶部搜索区 */}
      <div className={`sticky top-0 z-40 transition-all duration-500 ease-in-out ${hasSearched ? 'bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm py-4' : 'pt-[20vh] bg-transparent'}`}>
        <div className="max-w-4xl mx-auto px-4 flex flex-col gap-5">
          
          {!hasSearched && (
            <div className="text-center mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">全网灵感矩阵</h1>
              <p className="mt-3 text-zinc-500 text-[15px]">输入想了解的事物，AI 将为你打通全域高效搜索策略</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center flex-wrap gap-3 px-1">
               <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">🧠 AI 驱动引擎</span>
               <CustomDropdown options={MODELS} value={activeModel} onChange={setActiveModel} />
               <span className="flex items-center gap-1.5 rounded-full bg-blue-50/50 px-2.5 py-1 text-[11px] font-medium text-blue-600 transition-all">
                  本次搜索消耗 {currentCost} 积分
               </span>
            </div>

            <div className={`relative flex flex-col md:flex-row gap-3 items-center bg-white p-2 rounded-[24px] border border-black/[0.04] transition-all duration-300 ${hasSearched ? '' : 'shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.08)] focus-within:border-black/10'}`}>
              <div className="relative flex-grow w-full">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="你想探索什么？..."
                  className="w-full h-14 pl-12 pr-4 bg-transparent outline-none text-[16px] placeholder:text-zinc-400"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Search className="absolute left-4 top-4 text-zinc-400" size={20} />
              </div>
              
              <div className="flex bg-zinc-50 p-1 rounded-[18px] shrink-0 w-full md:w-auto">
                <button onClick={() => setMode("photography")} className={`flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-[14px] text-[13px] font-medium transition-all ${mode === "photography" ? "bg-white shadow-sm border border-black/5 text-zinc-900" : "text-zinc-500"}`}>
                  <Camera size={14} /> 现场实测
                </button>
                <button onClick={() => setMode("creative")} className={`flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-[14px] text-[13px] font-medium transition-all ${mode === "creative" ? "bg-white shadow-sm border border-black/5 text-zinc-900" : "text-zinc-500"}`}>
                  <Wand2 size={14} /> 深度解析
                </button>
              </div>
              
              <button onClick={handleSearch} disabled={loading || !query.trim()} className="h-12 w-full md:w-12 md:h-12 flex items-center justify-center bg-zinc-900 text-white rounded-[18px] hover:bg-zinc-800 disabled:opacity-50 transition-all active:scale-[0.96] shrink-0">
                {loading ? <span className="animate-pulse text-xs">✨</span> : <ChevronRight size={20} />}
              </button>
            </div>
            {error && !error.includes("次数") && <div className="text-red-500 text-sm pl-2">⚠️ {error}</div>}
          </div>
        </div>
      </div>

      {/* 结果展示区 */}
      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-12">
        {loading ? (
          <SkeletonLoader />
        ) : groupedResults.length > 0 ? (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-12">
            
            {/* 全局深度解析卡片 */}
            {aiAnalysisText && (
              <div className="relative overflow-hidden rounded-[24px] bg-white border border-black/[0.03] shadow-[0_4px_30px_rgb(0,0,0,0.03)] p-6 md:p-8 group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50/50 border border-blue-100 text-blue-600">
                    <Bot size={16} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-zinc-800 tracking-wide">AI 全局洞察</h3>
                </div>
                <div className="text-[15px] leading-relaxed text-zinc-600 whitespace-pre-wrap">
                  <TypewriterEffect text={aiAnalysisText} speed={15} />
                </div>
              </div>
            )}

            {/* Apple 风矩阵卡片 */}
            <div className="grid gap-12">
              {groupedResults.map((group, groupIdx) => {
                const combinedItems = [
                  { isRaw: true, title: "获取全量原始数据", searchQuery: query, reason: "探索基础内容", url: `https://www.google.com/search?q=${encodeURIComponent(query)}` },
                  ...group.items
                ];

                return (
                  <div key={groupIdx} className="space-y-4">
                    <div className="flex items-center gap-3 pl-2">
                      <h2 className="text-xl font-semibold tracking-tight text-zinc-900">{group.platform}</h2>
                      <span className="text-[11px] font-medium bg-black/[0.03] text-zinc-500 px-2.5 py-1 rounded-full uppercase">
                        {combinedItems.length} 个矩阵
                      </span>
                    </div>

                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                      {combinedItems.map((item, index) => (
                        <a 
                          key={index} href={item.url} onClick={(e) => handleCardClick(e, group.platform, item.searchQuery, item.url)}
                          className="group flex flex-col bg-white rounded-[20px] border border-black/[0.04] shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-400 ease-out overflow-hidden cursor-pointer"
                        >
                          <div className={`relative w-full flex flex-col justify-center items-center p-6 bg-gradient-to-br ${getGradient(index)} aspect-[4/3] border-b border-black/[0.02]`}>
                            <h3 className="text-[17px] font-semibold text-zinc-800 text-center leading-snug group-hover:scale-105 transition-transform duration-500">
                              "{item.searchQuery}"
                            </h3>
                          </div>
                          <div className="p-5 flex flex-col flex-grow bg-white">
                            <h4 className="font-medium text-[14px] text-zinc-800 line-clamp-1 mb-1">
                              {item.isRaw ? item.title : <TypewriterEffect text={item.title} speed={10} />}
                            </h4>
                            <p className="text-[12.5px] text-zinc-500 line-clamp-2 leading-relaxed flex-grow">
                              {item.isRaw ? item.reason : <TypewriterEffect text={item.reason} speed={25} />}
                            </p>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/[0.03]">
                              <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                                <Search size={12} /> 点击唤醒 App
                              </span>
                              <button onClick={(e) => handleSave(e, item, groupIdx * 100 + index)} className="text-zinc-300 hover:text-red-500 transition-colors">
                                <Heart size={16} className={savingIndex === (groupIdx * 100 + index) ? 'fill-red-500 text-red-500' : ''} />
                              </button>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}