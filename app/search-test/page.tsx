// app/search-test/page.tsx
"use client";

import { useState } from "react";
import { Sparkles, Search, ExternalLink, Heart } from "lucide-react";

export default function SearchTestPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    
    try {
      const res = await fetch("/api/ai/search-assets", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResults(data.suggestions || []);
    } catch (error) {
      console.error("搜索失败", error);
    } finally {
      setLoading(false);
    }
  };

  // 处理收藏逻辑
  const handleSave = async (item: any, index: number) => {
    setSavingIndex(index);
    try {
      const res = await fetch("/api/user/collection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: item.title,
          sourceUrl: item.url,
          platform: item.platform,
          description: item.reason,
        }),
      });
      
      if (res.ok) {
        alert("✨ 收藏成功！请前往个人中心查看。");
      } else {
        const errorData = await res.json();
        alert(errorData.error || "收藏失败，请确认是否已登录。");
      }
    } catch (error) {
      console.error("收藏出错", error);
      alert("网络错误，请稍后再试。");
    } finally {
      setSavingIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black p-8 pt-24 flex flex-col items-center">
      {/* Apple 风格标题 */}
      <div className="max-w-2xl w-full text-center space-y-4 mb-12">
        <h1 className="text-4xl font-semibold tracking-tight">AI 素材猎手</h1>
        <p className="text-gray-500 text-lg">输入你的灵感关键词，AI 替你去全网搜集素材。</p>
      </div>

      {/* 极简搜索框 */}
      <div className="max-w-2xl w-full relative group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="描述你需要的素材，如：深蓝色科技感大屏背景..."
          className="w-full h-16 pl-6 pr-16 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="absolute right-3 top-3 w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-30"
        >
          {loading ? <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" /> : <Search size={20} />}
        </button>
      </div>

      {/* 结果展示区 */}
      <div className="max-w-4xl w-full mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map((item, index) => (
          <div 
            key={index}
            className="p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all group relative flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 uppercase tracking-wider">
                {item.platform}
              </span>
              
              {/* 收藏按钮 */}
              <button 
                onClick={() => handleSave(item, index)}
                disabled={savingIndex === index}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all disabled:opacity-50"
                title="收藏该灵感"
              >
                <Heart size={18} className={savingIndex === index ? "fill-red-500 text-red-500 animate-pulse" : ""} />
              </button>
            </div>
            
            <h3 className="text-xl font-medium mb-2 pr-8">{item.title}</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed flex-grow">{item.reason}</p>
            
            <a
              href={item.url}
              target="_blank"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 w-fit"
            >
              前往该平台寻找 <ExternalLink size={14} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}