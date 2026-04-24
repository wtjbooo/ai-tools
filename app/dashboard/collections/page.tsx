"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // 引入路由跳转钩子
import { Heart, Loader2, Sparkles, FolderHeart } from "lucide-react";

interface CollectionItem {
  id: string;
  type: string;
  title: string;
  prompt: string;
  createdAt: string;
  isFavorited: boolean;
}

// 💡 新增：工具类型的“中英文翻译字典”
const typeMap: Record<string, string> = {
  reverse: "视频反推",
  enhance: "魔法扩写",
  search: "全网搜索",
};

export default function CollectionsPage() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter(); // 实例化路由钩子

  // 初始化拉取收藏数据
  useEffect(() => {
    async function fetchCollections() {
      try {
        const res = await fetch("/api/user/collection");
        if (res.ok) {
          const json = await res.json();
          setItems(json.data || []);
        }
      } catch (error) {
        console.error("无法拉取收藏记录:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCollections();
  }, []);

  // 取消收藏
  const handleRemoveFavorite = async (taskId: string) => {
    const previousItems = [...items];
    setItems(prevData => prevData.filter(item => item.id !== taskId));

    try {
      const res = await fetch("/api/ai/toggle-favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) throw new Error("取消收藏同步失败");
    } catch (error) {
      console.error(error);
      setItems(previousItems); // 失败回滚
    }
  };

  // 💡 新增：处理卡片点击跳转
  const handleCardClick = (taskId: string) => {
    // 根据你总览大盘支持的路由，携带 task 参数跳转
    router.push(`/dashboard?task=${taskId}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* 头部 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
          灵感收藏 <span className="text-zinc-300 font-light">/</span> 
          {/* 将英文改为了中文，保持科技感渐变色 */}
          <span className="text-zinc-400 text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
            专属金库
          </span>
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          那些让你惊艳的瞬间，都在这里被妥善保管。
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
          <p className="text-zinc-500 font-medium">正在开启灵感金库...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/50 rounded-[32px] border border-zinc-100/50 backdrop-blur-sm">
          <FolderHeart className="w-12 h-12 text-zinc-200 mb-4" />
          <p className="text-zinc-500 font-medium text-lg">金库空空如也</p>
          <p className="text-zinc-400 text-sm mt-1">去历史记录中点亮小爱心，将灵感珍藏于此吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => handleCardClick(item.id)} // 💡 给整个卡片加上点击跳转
              className="cursor-pointer group relative bg-white rounded-[28px] p-6 border border-zinc-200/60 shadow-sm 
                         hover:shadow-[0_20px_50px_rgba(99,102,241,0.06)] hover:border-indigo-200/80 
                         transition-all duration-500 flex flex-col h-64 overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="relative z-10 flex justify-between items-start mb-4">
                {/* 💡 将原始英文类型通过字典转换为中文 */}
                <span className="px-3 py-1 bg-zinc-50 text-zinc-500 text-[11px] font-bold tracking-wider rounded-lg border border-zinc-100">
                  {typeMap[item.type.toLowerCase()] || item.type}
                </span>
                
                <button
                  onClick={(e) => {
                    // 💡 极其关键的一步：阻止事件冒泡！
                    // 这样点击爱心时，就不会触发底层卡片的 handleCardClick 跳转逻辑了
                    e.stopPropagation(); 
                    handleRemoveFavorite(item.id);
                  }}
                  className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:scale-110 active:scale-90 transition-all z-20 relative"
                  title="取消收藏"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>
              </div>

              <div className="relative z-10 flex-1 flex flex-col min-h-0">
                <h3 className="text-[17px] font-bold text-zinc-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">
                  {item.title || "未命名灵感"}
                </h3>
                
                <div className="relative rounded-xl bg-zinc-50/80 p-3 border border-zinc-100 group-hover:bg-white transition-colors flex-1 overflow-hidden">
                  <p className="text-[12px] text-zinc-600 leading-relaxed line-clamp-3 font-mono">
                    {item.prompt}
                  </p>
                  <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-4 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-zinc-400 font-medium">
                  {item.createdAt}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}