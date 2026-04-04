// app/search-test/page.tsx
"use client";

import { useState } from "react";
import { Search, ExternalLink, Heart, Camera, Wand2, PlayCircle, Share2 } from "lucide-react";

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

  const handleSave = async (item: any, index: number) => {
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

  return (
    <div className="min-h-screen bg-[#F8F8F9] text-black pb-20">
      {/* 顶部聚合搜索条 */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-gray-100 p-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入品种或素材名，全网一键聚合实拍..."
              className="w-full h-12 pl-12 pr-4 rounded-2xl bg-gray-100 focus:bg-white focus:ring-2 focus:ring-black/5 transition-all outline-none font-medium"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
            <button 
              onClick={() => setMode("photography")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === "photography" ? "bg-white shadow-sm text-black" : "text-gray-500"}`}
            >
              <Camera size={14} /> 实拍为主
            </button>
            <button 
              onClick={() => setMode("creative")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === "creative" ? "bg-white shadow-sm text-black" : "text-gray-500"}`}
            >
              <Wand2 size={14} /> 创意效果
            </button>
          </div>
          
          <button onClick={handleSearch} disabled={loading} className="h-12 px-10 bg-black text-white rounded-2xl font-bold hover:opacity-90 disabled:opacity-30 transition-all shadow-lg shadow-black/10">
            {loading ? "聚合中..." : "全网搜"}
          </button>
        </div>
      </div>

      {/* 聚合结果瀑布流 */}
      <div className="max-w-7xl mx-auto px-4 mt-10">
        {results.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {results.map((item, index) => (
              <div key={index} className="break-inside-avoid group bg-white rounded-[28px] border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative">
                {/* 模拟封面占位 */}
                <div className="aspect-[4/5] bg-zinc-50 relative flex flex-col items-center justify-center p-8 text-center">
                  <div className="absolute top-4 left-4 px-3 py-1 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-tighter">
                    {item.platform}
                  </div>
                  <PlayCircle className="text-zinc-200 group-hover:text-black transition-colors" size={48} strokeWidth={1} />
                  <p className="mt-4 text-[11px] text-zinc-400 italic leading-relaxed">{item.reason}</p>
                </div>

                <div className="p-6">
                  <h3 className="font-bold text-sm leading-snug mb-4 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-400">来自：{item.author}</span>
                    <div className="flex gap-1">
                       <button onClick={() => handleSave(item, index)} className="p-2 hover:bg-red-50 rounded-full transition-colors">
                          <Heart size={16} className={`text-gray-300 ${savingIndex === index ? 'fill-red-500 text-red-500 animate-pulse' : 'hover:text-red-500'}`} />
                       </button>
                       <a href={item.url} target="_blank" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                          <ExternalLink size={16} className="text-gray-400" />
                       </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-32 text-gray-300">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Share2 size={32} className="opacity-20" />
            </div>
            <p className="font-medium text-gray-400">输入关键词，一键聚合全网实拍素材</p>
          </div>
        )}
      </div>
    </div>
  );
}