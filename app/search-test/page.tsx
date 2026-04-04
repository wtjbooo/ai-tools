// app/search-test/page.tsx
"use client";

import { useState } from "react";
import { Search, Heart, Camera, Wand2, Share2, ChevronRight, PlayCircle, Image as ImageIcon, BookOpen } from "lucide-react";

// 💡 扩充了平台，覆盖长视频与深度图文
const PLATFORMS = ["抖音", "小红书", "快手", "B站", "微博", "知乎"];

// 💡 为不同平台定制 Apple 级 UI 属性（比例、图标、标签）
const getPlatformConfig = (platform: string) => {
  switch (platform) {
    case "抖音":
    case "快手":
      return { aspect: "aspect-[9/16]", icon: <PlayCircle size={12} />, tag: "短视频" };
    case "小红书":
      return { aspect: "aspect-[3/4]", icon: <ImageIcon size={12} />, tag: "图文" };
    case "B站":
      return { aspect: "aspect-[16/9]", icon: <PlayCircle size={12} />, tag: "视频" };
    default: // 微博, 知乎
      return { aspect: "aspect-[21/9]", icon: <BookOpen size={12} />, tag: "资讯" };
  }
};

// 💡 生成高级质感的网格渐变（在没有真实封面时的完美占位）
const getGradient = (index: number) => {
  const gradients = [
    "from-[#fdfbfb] to-[#ebedee]",
    "from-[#f5f7fa] to-[#c3cfe2]",
    "from-[#e0c3fc] to-[#8ec5fc]",
    "from-[#accbee] to-[#e7f0fd]",
  ];
  return gradients[index % gradients.length];
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
      if (res.ok) alert("✨ 已收藏到个人中心");
    } finally {
      setSavingIndex(null);
    }
  };

  const groupedResults = PLATFORMS.map(platform => ({
    platform,
    items: results.filter(r => r.platform.includes(platform))
  })).filter(group => group.items.length > 0);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fafafa_0%,#f7f7f8_100%)] text-gray-900 pb-20">
      {/* 顶部搜索条 (Apple 质感升级) */}
      <div className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-black/5 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入品种或素材名，全网分类聚合..."
              className="w-full h-12 pl-11 pr-4 rounded-[16px] bg-black/[0.03] focus:bg-white focus:ring-2 focus:ring-black/10 transition-all outline-none text-[15px] font-medium border border-transparent focus:border-black/5"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
          </div>
          
          <div className="flex bg-black/[0.03] p-1 rounded-[14px] shrink-0">
            <button 
              onClick={() => setMode("photography")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${mode === "photography" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Camera size={14} /> 实拍/现场
            </button>
            <button 
              onClick={() => setMode("creative")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${mode === "creative" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Wand2 size={14} /> 创意/科普
            </button>
          </div>
          
          <button onClick={handleSearch} disabled={loading} className="h-12 px-8 bg-gray-900 text-white rounded-[14px] text-[15px] font-semibold hover:bg-black hover:shadow-md disabled:opacity-50 transition-all active:scale-[0.98]">
            {loading ? "AI 聚合中..." : "全网搜"}
          </button>
        </div>
      </div>

      {/* 分类结果展示区 */}
      <div className="max-w-7xl mx-auto px-4 mt-10 space-y-16">
        {groupedResults.length > 0 ? (
          groupedResults.map((group, groupIdx) => {
            const config = getPlatformConfig(group.platform);
            
            return (
              <div key={groupIdx} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* 平台标题 */}
                <div className="flex items-center justify-between pb-3 border-b border-black/5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900">{group.platform}</h2>
                    <span className="text-[11px] font-bold bg-black/[0.04] text-gray-600 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {group.items.length} 结果
                    </span>
                  </div>
                </div>

                {/* 动态网格，根据平台特性调整列数 */}
                <div className={`grid gap-5 ${
                  group.platform === "抖音" || group.platform === "快手" ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-5" :
                  group.platform === "小红书" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : 
                  "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                }`}>
                  {group.items.map((item, index) => (
                    <a 
                      key={index} 
                      href={item.url} 
                      target="_blank" 
                      className="group flex flex-col bg-white rounded-[24px] border border-black/[0.04] shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_14px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                    >
                      {/* 封面图区域 */}
                      <div className={`relative w-full overflow-hidden bg-gradient-to-br ${getGradient(index)} ${config.aspect}`}>
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                        ) : (
                          /* 如果没有图片，显示轻量级的图标纹理 */
                          <div className="absolute inset-0 flex items-center justify-center opacity-10 mix-blend-overlay">
                             {config.icon}
                          </div>
                        )}
                        {/* 平台标签徽章 */}
                        <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-md text-white text-[10px] font-medium px-2 py-1 rounded-[8px] flex items-center gap-1.5 shadow-sm">
                          {config.icon} {config.tag}
                        </div>
                      </div>

                      {/* 文字与操作区 */}
                      <div className="p-4 flex flex-col flex-grow">
                        <h3 className="font-semibold text-[14px] text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-relaxed mb-1.5">
                          {item.title}
                        </h3>
                        <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed flex-grow">
                          {item.reason}
                        </p>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5">
                          <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                            @{item.author}
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
              <Share2 size={28} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI 智能聚合</h3>
            <p className="text-sm font-medium">输入关键词，打破信息茧房，一键获取全网优质素材</p>
          </div>
        )}
      </div>
    </div>
  );
}