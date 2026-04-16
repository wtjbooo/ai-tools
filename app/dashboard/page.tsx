// app/dashboard/page.tsx
"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Sparkles, Zap, Image as ImageIcon, Video, ArrowRight } from "lucide-react";

export default function DashboardOverview() {
  const { user } = useAuth();

  // 模拟一些数据，后续我们将对接真实的 API
  const mockQuota = { used: 420, total: 1000 };
  const percent = Math.min((mockQuota.used / mockQuota.total) * 100, 100);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 头部欢迎区 */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            欢迎回来，{user?.nickname || user?.name || "创作者"}
            {user?.isPro && <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />}
          </h1>
          <p className="mt-2 text-[14px] text-zinc-500">这里是你的专属 AI 灵感控制中心。</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 transition-all active:scale-95">
          <Zap className="w-4 h-4 text-indigo-400" />
          升级引擎算力
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ✨ 核心算力额度卡片 ✨ */}
        <div className="md:col-span-2 relative overflow-hidden rounded-[32px] bg-white p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-zinc-100">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <Zap className="w-32 h-32 text-indigo-600" />
          </div>
          <h3 className="text-[16px] font-bold text-zinc-900 mb-6 flex items-center gap-2">
            本月算力配额
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[11px] font-bold uppercase">Pro</span>
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="text-[36px] font-black tracking-tight text-zinc-900 leading-none">
                {mockQuota.used} <span className="text-[16px] text-zinc-400 font-medium">/ {mockQuota.total} 积分</span>
              </div>
              <div className="text-[14px] font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                剩余 {mockQuota.total - mockQuota.used}
              </div>
            </div>
            
            {/* 充满科技感的进度条 */}
            <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 relative"
                style={{ width: `${percent}%` }}
              >
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]" />
              </div>
            </div>
            <p className="text-[12px] text-zinc-400 font-medium pt-1">算力额度将于下月 1 号自动重置</p>
          </div>
        </div>

        {/* 快捷通道 */}
        <div className="rounded-[32px] bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 shadow-[0_12px_40px_rgba(24,24,27,0.15)] text-white relative overflow-hidden group">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
          <h3 className="text-[16px] font-bold mb-6 text-zinc-100">快速启动</h3>
          <div className="space-y-3 relative z-10">
            <button className="w-full flex items-center justify-between p-3.5 rounded-[16px] bg-white/10 hover:bg-white/20 transition-all backdrop-blur-md border border-white/5 group/btn">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                <span className="text-[14px] font-medium">图像提示词反推</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" />
            </button>
            <button className="w-full flex items-center justify-between p-3.5 rounded-[16px] bg-white/10 hover:bg-white/20 transition-all backdrop-blur-md border border-white/5 group/btn">
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-purple-400" />
                <span className="text-[14px] font-medium">魔法视频扩写</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}