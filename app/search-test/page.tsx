// app/search-test/page.tsx
"use client";

import { useState } from "react";
import { Search, Heart, Camera, Wand2, Share2, ChevronRight, Sparkles, Target } from "lucide-react";

const PLATFORMS = ["抖音", "小红书", "快手", "B站", "微博", "知乎"];

const getPlatformConfig = (platform: string) => {
  switch (platform) {
    case "抖音":
    case "快手":
      return { aspect: "aspect-[4/3]", tag: "短视频" };
    case "小红书":
      return { aspect: "aspect-[4/3]", tag: "图文攻略" };
    case "B站":
      return { aspect: "aspect-[16/9]", tag: "深度视频" };
    default:
      return { aspect: "aspect-[21/9]", tag: "热议/问答" };
  }
};

const getGradient = (index: number) => {
  const gradients = [
    "from-zinc-100 to-zinc-50",
    "from-slate-100 to-gray-50",
    "from-neutral-100 to-zinc-50",
    "from-stone-100 to-gray-50",
    "from-gray-100 to-slate-50",
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

export default function SearchTestPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"photography" | "creative">("photography");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/search-assets", {
        method: "POST",
        body: JSON.stringify({ query, mode }),
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
        body: JSON.stringify({
          title: item.title,
          sourceUrl: item.url,
          platform: item.platform,
          description: item.reason,
        }),
      });
      if (res.ok) alert("✨ 已成功收藏");
    } finally {
      setSavingIndex(null);
    }
  };

  // 💡 核心黑科技：智能判断终端并尝试唤醒各大平台原生 App
  const handleCardClick = (e: React.MouseEvent, platform: string, keyword: string, fallbackUrl: string) => {
    e.preventDefault();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      let scheme = "";
      const encoded = encodeURIComponent(keyword);
      // 各大厂底层协议唤起码
      switch (platform) {
        case "抖音": scheme = `snssdk1128://search/?keyword=${encoded}`; break;
        case "小红书": scheme = `xhsdiscover://search/result?keyword=${encoded}`; break;
        case "快手": scheme = `kwai://search?keyword=${encoded}`; break;
        case "B站": scheme = `bilibili://search?keyword=${encoded}`; break;
        case "微博": scheme = `sinaweibo://searchall?q=${encoded}`; break;
        case "知乎": scheme = `zhihu://search?q=${encoded}`; break;
      }

      if (scheme) {
        // 尝试唤醒 App
        window.location.href = scheme;
        // 设定一个 600ms 的延迟，如果没安装 App 导致唤醒失败，则自动跳去网页版兜底
        setTimeout(() => {
          window.open(fallbackUrl, "_blank");
        }, 600);
        return;
      }
    }
    // 电脑端或未匹配的平台，直接新窗口打开网页
    window.open(fallbackUrl, "_blank");
  };

  const groupedResults = PLATFORMS.map(platform => ({
    platform,
    items: results.filter(r => r.platform === platform)
  })).filter(group => group.items.length > 0);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fafafa_0%,#f7f7f8_100%)] text-gray-900 pb-20">
      <div className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-black/5 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入想了解的产品或话题，获取全网搜索策略..."
              className="w-full h-12 pl-11 pr-4 rounded-[16px] bg-black/[0.03] focus:bg-white focus:ring-2 focus:ring-black/10 transition-all outline-none text-[15px] font-medium border border-transparent focus:border-black/5"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
          </div>
          
          <div className="flex bg-black/[0.03] p-1 rounded-[14px] shrink-0">
            <div className="relative group">
              <button 
                onClick={() => setMode("photography")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${mode === "photography" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Camera size={14} /> 现场/实拍反馈
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-max max-w-[200px] px-3.5 py-2.5 bg-gray-900/95 backdrop-blur-md text-white text-[11px] font-medium leading-relaxed rounded-[12px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 shadow-xl pointer-events-none translate-y-1 group-hover:translate-y-0 text-center">
                引导 AI 为你挖掘真实的买家秀、避坑指南与落地效果。
                <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 border-x-[6px] border-x-transparent border-b-[6px] border-b-gray-900/95"></div>
              </div>
            </div>

            <div className="relative group">
              <button 
                onClick={() => setMode("creative")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${mode === "creative" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Wand2 size={14} /> 深度/原理解析
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-max max-w-[200px] px-3.5 py-2.5 bg-gray-900/95 backdrop-blur-md text-white text-[11px] font-medium leading-relaxed rounded-[12px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 shadow-xl pointer-events-none translate-y-1 group-hover:translate-y-0 text-center">
                引导 AI 为你挖掘硬核科普、技术教程与底层逻辑。
                <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 border-x-[6px] border-x-transparent border-b-[6px] border-b-gray-900/95"></div>
              </div>
            </div>
          </div>
          
          <button onClick={handleSearch} disabled={loading} className="h-12 px-8 bg-gray-900 text-white rounded-[14px] text-[15px] font-semibold hover:bg-black hover:shadow-md disabled:opacity-50 transition-all active:scale-[0.98]">
            {loading ? "AI 推演中..." : "全网搜"}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-10 space-y-16">
        {groupedResults.length > 0 ? (
          groupedResults.map((group, groupIdx) => {
            const config = getPlatformConfig(group.platform);
            
            const combinedItems = [
              {
                isRaw: true,
                title: "直接搜索原词，获取全量无过滤结果",
                searchQuery: query,
                reason: "探索该平台下关于此词条的所有基础内容",
                url: getPlatformSearchUrl(group.platform, query)
              },
              ...group.items
            ];

            return (
              <div key={groupIdx} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between pb-3 border-b border-black/5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900">{group.platform}</h2>
                    <span className="text-[11px] font-bold bg-black/[0.04] text-gray-600 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {combinedItems.length} 个搜索选项
                    </span>
                  </div>
                </div>

                <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                  {combinedItems.map((item, index) => (
                    <a 
                      key={index} 
                      href={item.url} 
                      onClick={(e) => handleCardClick(e, group.platform, item.searchQuery, item.url)}
                      className="group flex flex-col bg-white rounded-[24px] border border-black/[0.04] shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_14px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
                    >
                      <div className={`relative w-full flex flex-col justify-center items-center p-6 bg-gradient-to-br ${getGradient(index)} ${config.aspect} border-b border-black/[0.03]`}>
                        {item.isRaw ? (
                          <Target className="absolute top-4 left-4 text-black/10" size={24} />
                        ) : (
                          <Sparkles className="absolute top-4 left-4 text-black/10" size={24} />
                        )}
                        
                        <span className={`text-[11px] font-bold tracking-[0.2em] mb-2 uppercase ${item.isRaw ? 'text-gray-600' : 'text-gray-400'}`}>
                          {item.isRaw ? "🎯 原词直达" : "✨ AI 推荐搜索词"}
                        </span>
                        
                        <h3 className="text-[18px] sm:text-[20px] font-bold text-gray-900 text-center leading-snug group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                          "{item.searchQuery}"
                        </h3>
                        <div className="absolute bottom-3 right-3 bg-white/60 backdrop-blur-md text-gray-700 text-[10px] font-medium px-2 py-1 rounded-[8px] flex items-center shadow-sm">
                          {config.tag}
                        </div>
                      </div>

                      <div className="p-5 flex flex-col flex-grow">
                        <h4 className="font-semibold text-[14px] text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1.5">
                          {item.title}
                        </h4>
                        <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed flex-grow">
                          {item.reason}
                        </p>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5">
                          <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1">
                            <Search size={12} /> App 内唤醒
                          </span>
                          
                          <div className="flex items-center gap-1">
                             <button 
                               onClick={(e) => handleSave(e, item, groupIdx * 100 + index)} 
                               className="p-1.5 hover:bg-red-50 rounded-full transition-colors z-10"
                             >
                                <Heart size={16} className={`transition-all ${savingIndex === (groupIdx * 100 + index) ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-300 hover:text-red-500'}`} />
                             </button>
                             <div className="p-1.5 text-gray-300 group-hover:text-gray-900 transition-colors">
                                <ChevronRight size={16} />
                             </div>
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
            <div className="w-20 h-20 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] flex items-center justify-center mb-6 animate-bounce">
              <Wand2 size={28} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">全网搜索灵感引擎</h3>
            <p className="text-sm font-medium">输入想了解的事物，AI 为你生成直达各平台的高效搜索策略</p>
          </div>
        )}
      </div>
    </div>
  );
}