// app/dashboard/page.tsx
"use client";

import { useAuth } from "@/components/auth/auth-provider";
import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  Sparkles, Zap, Image as ImageIcon, Video, ArrowRight,
  Clock, Activity, Cpu, ArrowUpRight, Loader2
} from "lucide-react";
import { useUpgradeModal } from "@/contexts/UpgradeModalContext";
import CheckInWidget from "@/components/dashboard/CheckInWidget"; // 导入签到组件

interface DashboardData {
  quota: { used: number; total: number; remaining: number };
  recentActivities: Array<{
    id: string; title: string; type: string; time: string; platform: string;
  }>;
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const { openModal } = useUpgradeModal();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // 🚀 提取刷新函数
  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/user/dashboard");
      if (!res.ok) throw new Error("无法加载工作台数据");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "发生未知错误");
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  if (isLoading || !data) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-400">
         <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
         <p className="text-sm font-medium">正在同步节点数据...</p>
       </div>
    );
  }

  if (error) {
    return (
       <div className="p-6 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
         节点连接失败: {error}
       </div>
    );
  }

  const quota = data.quota;
  const recentActivities = data.recentActivities || []; 
  const percent = Math.min((quota.used / quota.total) * 100, 100);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            欢迎回来，{user?.nickname || user?.name || "创作者"}
            {user?.isPro && <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />}
          </h1>
          <p className="mt-2 text-[14px] text-zinc-500">这里是你的专属 AI 灵感控制中心。</p>
        </div>
        <button onClick={() => openModal()} className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 transition-all active:scale-95">
          <Zap className="w-4 h-4 text-indigo-400" />
          升级引擎算力
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 左侧大卡片 */}
        <div className="md:col-span-2 relative overflow-hidden rounded-[32px] bg-white p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-zinc-100">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <Zap className="w-32 h-32 text-indigo-600" />
          </div>
          <h3 className="text-[16px] font-bold text-zinc-900 mb-6 flex items-center gap-2">
            本月算力配额
            {user?.isPro && <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[11px] font-bold uppercase tracking-wider">Pro</span>}
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="text-[36px] font-black tracking-tight text-zinc-900 leading-none">
                {quota.used} <span className="text-[16px] text-zinc-400 font-medium">/ {quota.total} 积分</span>
              </div>
              <div className="text-[14px] font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                剩余 {quota.remaining}
              </div>
            </div>
            <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden shadow-inner">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 relative transition-all duration-1000 ease-out" style={{ width: `${percent}%` }}>
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]" />
              </div>
            </div>
            <p className="text-[12px] text-zinc-400 font-medium pt-1">算力额度将于下月 1 号自动重置</p>
          </div>
        </div>

        {/* 🚀 修复后的右侧列 */}
        <div className="flex flex-col gap-6">
          {/* 签到组件：成功后自动刷新整个面板数据 */}
          <CheckInWidget onSuccess={fetchDashboardData} /> 

          {/* 快速启动黑卡 */}
          <div className="flex-1 rounded-[32px] bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 shadow-[0_12px_40px_rgba(24,24,27,0.15)] text-white relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
            <h3 className="text-[16px] font-bold mb-6 text-zinc-100">快速启动</h3>
            <div className="space-y-3 relative z-10">
              <Link href="/reverse-prompt" className="w-full flex items-center justify-between p-3.5 rounded-[16px] bg-white/10 hover:bg-white/20 transition-all backdrop-blur-md border border-white/5 group/btn">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-cyan-400" />
                  <span className="text-[14px] font-medium">图像提示词反推</span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" />
              </Link>
              <Link href="/enhance-prompt" className="w-full flex items-center justify-between p-3.5 rounded-[16px] bg-white/10 hover:bg-white/20 transition-all backdrop-blur-md border border-white/5 group/btn">
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-purple-400" />
                  <span className="text-[14px] font-medium">魔法视频扩写</span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 下半部分保持不变... */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-[32px] bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-zinc-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[16px] font-bold text-zinc-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-400" />
              近期轨迹
            </h3>
            <Link href="/dashboard/history" className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group/link">
              查看全部 <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="space-y-3 flex-1">
            {recentActivities.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-zinc-400 opacity-60 min-h-[120px]">
                 <span className="text-sm font-medium">暂无生成记录，快去开启灵感吧</span>
               </div>
            ) : recentActivities.map((activity) => {
              let targetUrl = `/reverse-prompt?task=${activity.id}`; 
              if (activity.type === 'video') targetUrl = `/enhance-prompt?task=${activity.id}`; 
              if (activity.type === 'sparkles') targetUrl = `/search-test?task=${activity.id}`; 
              return (
                <Link href={targetUrl} key={activity.id} className="group flex items-center justify-between p-3 sm:p-4 rounded-[20px] hover:bg-zinc-50 border border-transparent hover:border-zinc-100 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:bg-white group-hover:text-indigo-500 group-hover:shadow-sm transition-all border border-zinc-200/50">
                      {activity.type === 'video' ? <Video className="w-4 h-4" /> : activity.type === 'image' ? <ImageIcon className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-zinc-900">{activity.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-medium text-zinc-500">{activity.platform}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                        <span className="text-[11px] text-zinc-400">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-[32px] bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-zinc-100 flex flex-col relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <h3 className="text-[16px] font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-zinc-400" />
            节点状态
          </h3>
          <div className="space-y-5 flex-1">
            <div className="flex items-center justify-between p-4 rounded-[20px] bg-zinc-50 border border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </div>
                <span className="text-[13px] font-semibold text-zinc-900">核心引擎联机中</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">99.9%</span>
            </div>
            <div className="px-1 space-y-2">
              <div className="flex justify-between text-[12px] font-medium">
                <span className="text-zinc-500 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> N1N Gateway</span>
                <span className="text-zinc-900 font-mono">24ms</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-1.5">
                <div className="bg-zinc-900 h-1.5 rounded-full" style={{ width: '28%' }}></div>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-zinc-100">
               <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md mb-2">UPDATE</span>
               <p className="text-[13px] text-zinc-600 leading-relaxed font-medium">
                 全新 <strong className="text-zinc-900">Sora-Pro</strong> 反推模型已接入节点。生成速度提升 40%。
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}