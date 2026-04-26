"use client";

import { useState, useEffect } from "react";
import { Sparkles, Check } from "lucide-react";
import { DAILY_CHECKIN_REWARD } from "@/lib/pricing";

export default function CheckInWidget() {
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 解决 Next.js SSR 水合报错：只在客户端渲染当前时间
  const [dateInfo, setDateInfo] = useState({ day: "--", month: "---", weekday: "星期-" });

  useEffect(() => {
    const now = new Date();
    setDateInfo({
      day: now.getDate().toString(),
      month: now.toLocaleString('zh-CN', { month: 'short' }),
      weekday: now.toLocaleString('zh-CN', { weekday: 'long' })
    });
  }, []);

  const handleCheckIn = async () => {
    if (loading || hasCheckedIn) return;
    setLoading(true);
    
    try {
      const res = await fetch("/api/user/checkin", { method: "POST" });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setHasCheckedIn(true);
        // 如果你使用了全局状态管理(Zustand/Context)，可以在这里触发 updateUser() 刷新左侧卡片的总积分
      } else {
        // 如果后端返回今日已签到，前端也直接变灰
        if (data.error === "今日已领取过算力") {
          setHasCheckedIn(true);
        }
      }
    } catch (err) {
      console.error("签到请求异常", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-black/[0.03] bg-white p-5 shadow-[0_4px_24px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_8px_32px_rgb(0,0,0,0.04)]">
      {/* ✨ 20% AI 灵动风：未签到时背景隐约的极光漫反射 */}
      {!hasCheckedIn && (
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-500/10 blur-[40px] transition-opacity duration-700 group-hover:opacity-100 animate-pulse pointer-events-none" />
      )}

      <div className="flex items-center justify-between relative z-10">
        {/* 🍏 80% Apple 简约风：iOS 小组件质感日期展示 */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center rounded-[18px] bg-zinc-50/80 px-4 py-2 border border-black/[0.02] shadow-sm backdrop-blur-sm">
            <span className="text-[24px] font-bold leading-none text-zinc-900 tracking-tight">{dateInfo.day}</span>
            <span className="mt-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{dateInfo.month}</span>
          </div>
          <div>
            <h4 className="text-[15px] font-semibold text-zinc-800 tracking-wide">{dateInfo.weekday}</h4>
            <p className="text-[12px] text-zinc-400 mt-0.5">获取今日 AI 算力补给</p>
          </div>
        </div>

        {/* 右侧：交互按钮 */}
        <button
          onClick={handleCheckIn}
          disabled={hasCheckedIn || loading}
          className={`relative flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium transition-all duration-500 ${
            hasCheckedIn
              ? "bg-zinc-50 text-zinc-400 border border-transparent cursor-not-allowed shadow-none"
              : "bg-zinc-900 text-white shadow-lg shadow-zinc-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          {hasCheckedIn ? (
            <>
              <Check size={14} className="text-emerald-500" />
              已领取
            </>
          ) : (
            <>
              <Sparkles size={14} className={loading ? "animate-spin text-indigo-300" : "animate-pulse text-indigo-300"} />
              {loading ? "验证中..." : `领取 ${DAILY_CHECKIN_REWARD} 积分`}
            </>
          )}
        </button>
      </div>
    </div>
  );
}