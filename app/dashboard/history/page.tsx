// app/dashboard/history/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  History, 
  Copy, 
  Heart, 
  ExternalLink, 
  Search, 
  Filter,
  Sparkles,
  PlayCircle,
  Code2,
  Loader2
} from "lucide-react";

// 1. 🚀 修改点：在接口中增加 isFavorited 字段
interface HistoryItem {
  id: string;
  type: string;
  title: string;
  platform: string;
  thumbnail: string;
  prompt: string;
  tags: string[];
  createdAt: string;
  isFavorited?: boolean; // 新增这一行
}

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/user/history");
        if (res.ok) {
          const json = await res.json();
          setHistoryData(json.data || []);
        }
      } catch (error) {
        console.error("无法拉取历史记录:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, []);

  // 2. 🚀 核心修改点：处理爱心点击的“乐观更新”逻辑
  const handleToggleFavorite = async (taskId: string, currentStatus: boolean) => {
    // 步骤 A: 乐观更新 - 瞬间改变 UI 状态，不让用户等
    setHistoryData(prevData => 
      prevData.map(item => 
        item.id === taskId ? { ...item, isFavorited: !currentStatus } : item
      )
    );

    try {
      // 步骤 B: 在后台静默发送真实请求
      const res = await fetch("/api/ai/toggle-favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      if (!res.ok) throw new Error("收藏状态同步失败");
      
    } catch (error) {
      console.error(error);
      // 步骤 C: 如果网络断开或服务器报错，偷偷把状态改回来
      setHistoryData(prevData => 
        prevData.map(item => 
          item.id === taskId ? { ...item, isFavorited: currentStatus } : item
        )
      );
      // 这里未来可以加一个 Toast 弹窗提示用户“网络错误”
    }
  };

  const filteredHistory = historyData.filter((item) => {
    const matchesTab = 
      activeTab === "all" ? true :
      activeTab === "视频反推" ? item.type === "reverse" :
      activeTab === "魔法扩写" ? item.type === "enhance" :
      activeTab === "全网搜索" ? item.type === "search" : true;
    
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            生成记录 <span className="text-zinc-300 font-light">/</span> 
            <span className="text-zinc-400 text-lg font-medium">Memory Archive</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">回顾、复制并继续完善你的 AI 灵感轨迹。</p>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text"
            placeholder="搜索提示词或任务..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "全部" },
          { id: "视频反推", label: "视频反推" },
          { id: "魔法扩写", label: "魔法扩写" },
          { id: "全网搜索", label: "全网搜索" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/10" 
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-zinc-400">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-medium">按时间排序</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
          <p className="text-zinc-500 font-medium">正在读取时空记忆...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredHistory.map((item) => (
              <div 
                key={item.id}
                className="group relative flex flex-col sm:flex-row gap-5 p-5 bg-white rounded-[28px] border border-zinc-200/60 hover:border-indigo-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all duration-500"
              >
                <div className="relative w-full sm:w-48 h-32 shrink-0 rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-100 group-hover:shadow-md transition-all">
                  <img src={item.thumbnail} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                      {item.platform}
                    </span>
                  </div>
                  {item.type === "reverse" && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="w-8 h-8 text-white drop-shadow-lg" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-[15px] font-bold text-zinc-900 truncate group-hover:text-indigo-600 transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={() => navigator.clipboard.writeText(item.prompt)}
                          className="p-2 rounded-full hover:bg-zinc-50 text-zinc-400 hover:text-indigo-500 transition-all active:scale-95"
                          title="复制内容"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* 3. 🚀 核心修改点：绑定点击事件与动态样式 */}
                        <button 
                          onClick={() => handleToggleFavorite(item.id, !!item.isFavorited)}
                          className={`p-2 rounded-full transition-all active:scale-90 ${
                            item.isFavorited 
                              ? "bg-red-50 text-red-500" 
                              : "hover:bg-zinc-50 text-zinc-400 hover:text-red-400"
                          }`}
                          title={item.isFavorited ? "取消收藏" : "加入收藏"}
                        >
                          <Heart className={`w-4 h-4 transition-all duration-300 ${item.isFavorited ? "fill-current scale-110" : ""}`} />
                        </button>

                      </div>
                    </div>
                    
                    <div className="relative rounded-xl bg-zinc-50/80 p-3 border border-zinc-100 group-hover:bg-white transition-colors">
                      <p className="text-[12px] text-zinc-600 leading-relaxed line-clamp-2 font-mono">
                        {item.prompt}
                      </p>
                      <div className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-1.5 overflow-hidden">
                      {item.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-400 text-[10px] font-medium whitespace-nowrap">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-zinc-300 font-medium shrink-0">{item.createdAt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 opacity-40">
               <Code2 className="w-12 h-12 text-zinc-300 mb-4" />
               <p className="text-zinc-500 font-medium">尚未发现任何灵感记录</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}