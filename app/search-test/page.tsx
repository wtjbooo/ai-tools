// app/search-test/page.tsx
"use client";

import { useState } from "react";
import { Search, ExternalLink, Heart, Camera, Wand2, Share2, ChevronRight } from "lucide-react";

const PLATFORMS = ["抖音", "小红书", "微博", "快手"];

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
    e.preventDefault(); // 阻止点击爱心时触发整个卡片的跳转
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

  // 按平台对结果进行分组
  const groupedResults = PLATFORMS.map(platform => ({
    platform,
    items: results.filter(r => r.platform.includes(platform))
  })).filter(group => group.items.length > 0);

  return (
    <div className="min-h-screen bg-[#F8F8F9] text-black pb-20">
      {/* 顶部搜索条 */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-gray-100 p-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入品种或素材名，全网分类聚合..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-100 focus:bg-white focus:ring-2 focus:ring-black/5 transition-all outline-none text-sm font-medium"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
            <button 
              onClick={() => setMode("photography")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === "photography" ? "bg-white shadow-sm text-black" : "text-gray-500"}`}
            >
              <Camera size={14} /> 实拍/现场
            </button>
            <button 
              onClick={() => setMode("creative")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === "creative" ? "bg-white shadow-sm text-black" : "text-gray-500"}`}
            >
              <Wand2 size={14} /> 创意/科普
            </button>
          </div>
          
          <button onClick={handleSearch} disabled={loading} className="h-11 px-8 bg-black text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-30 transition-all">
            {loading ? "聚合中..." : "全网搜"}
          </button>
        </div>
      </div>

      {/* 分类结果展示区 */}
      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-10">
        {groupedResults.length > 0 ? (
          groupedResults.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-4">
              {/* 平台标题 */}
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <h2 className="text-lg font-bold tracking-tight">{group.platform}</h2>
                <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {group.items.length} 个结果
                </span>
              </div>

              {/* 紧凑型卡片网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((item, index) => (
                  <a 
                    key={index} 
                    href={item.url} 
                    target="_blank" 
                    className="group flex flex-col justify-between bg-white p-4 rounded-2xl border border-gray-100 hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug mb-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {item.reason}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                      <span className="text-[11px] font-medium text-gray-400">@{item.author}</span>
                      
                      <div className="flex items-center gap-1">
                         <button 
                           onClick={(e) => handleSave(e, item, groupIdx * 100 + index)} 
                           className="p-1.5 hover:bg-red-50 rounded-full transition-colors z-10"
                         >
                            <Heart size={14} className={`text-gray-300 ${savingIndex === (groupIdx * 100 + index) ? 'fill-red-500 text-red-500' : 'hover:text-red-500'}`} />
                         </button>
                         <div className="p-1.5 text-gray-300 group-hover:text-blue-500 transition-colors">
                            <ChevronRight size={14} />
                         </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center pt-24 text-gray-300">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Share2 size={24} className="opacity-30" />
            </div>
            <p className="text-sm font-medium text-gray-400">输入关键词，一键分类聚合全网素材</p>
          </div>
        )}
      </div>
    </div>
  );
}