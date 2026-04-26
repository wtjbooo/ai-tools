"use client";

import { useState, useEffect } from "react";
import { Sparkles, Check } from "lucide-react";
import { DAILY_CHECKIN_REWARD, PRO_DAILY_REWARD } from "@/lib/pricing";
import { useAuth } from "@/components/auth/auth-provider"; // 获取用户身份

export default function CheckInWidget({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth(); // 👈 真实获取当前登录的用户数据
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [dateInfo, setDateInfo] = useState({ day: "--", month: "---", weekday: "星期-" });

  // 💡 动态计算该给当前用户显示多少积分 (根据 isPro 状态)
  const displayReward = user?.isPro ? PRO_DAILY_REWARD : DAILY_CHECKIN_REWARD;

  useEffect(() => {
    // 设置本地日期
    const now = new Date();
    setDateInfo({
      day: now.getDate().toString(),
      month: now.toLocaleString('zh-CN', { month: 'short' }),
      weekday: now.toLocaleString('zh-CN', { weekday: 'long' })
    });

    // 向后端查询今天是否已经签到过了
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/user/checkin");
        if (res.ok) {
          const data = await res.json();
          if (data.hasCheckedInToday) {
            setHasCheckedIn(true);
          }
        }
      } catch (err) {
        console.error("获取签到状态失败");
      } finally {
        setLoading(false);
      }
    };
    
    checkStatus();
  }, []);

  const handleCheckIn = async () => {
    if (loading || hasCheckedIn) return;
    setLoading(true);
    
    try {
      const res = await fetch("/api/user/checkin", { method: "POST" });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setHasCheckedIn(true);
        if (onSuccess) onSuccess(); // 🚀 新增：通知外面刷新数据！
      } else if (data.error === "今日已领取过算力") {
        setHasCheckedIn(true);
      }
    } catch (err) {
      console.error("签到请求异常", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-[32px] border border-black/[0.03] bg-white p-5 shadow-[0_4px_24px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_8px_32px_rgb(0,0,0,0.04)]">
      {/* AI 极光背景 */}
      {!hasCheckedIn && (
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-500/10 blur-[40px] transition-opacity duration-700 group-hover:opacity-100 animate-pulse pointer-events-none" />
      )}

      {/* 严格控制子元素的压缩规则 */}
      <div className="flex items-center justify-between relative z-10 w-full gap-2">
        
        {/* 左侧区域 */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 flex flex-col items-center justify-center rounded-[18px] bg-zinc-50/80 w-12 h-12 border border-black/[0.02] shadow-sm backdrop-blur-sm">
            <span className="text-[20px] font-bold leading-none text-zinc-900 tracking-tight">{dateInfo.day}</span>
            <span className="mt-0.5 text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">{dateInfo.month}</span>
          </div>
          
          <div className="min-w-0">
            <h4 className="text-[14px] font-semibold text-zinc-800 tracking-wide truncate whitespace-nowrap">{dateInfo.weekday}</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate whitespace-nowrap">获取今日 AI 补给</p>
          </div>
        </div>

        {/* 右侧按钮 */}
        <button
          onClick={handleCheckIn}
          disabled={hasCheckedIn || loading}
          className={`shrink-0 whitespace-nowrap relative flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium transition-all duration-500 ${
            hasCheckedIn
              ? "bg-zinc-50 text-zinc-400 border border-transparent cursor-not-allowed shadow-none"
              : "bg-zinc-900 text-white shadow-lg shadow-zinc-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          {loading ? (
            <Sparkles size={14} className="animate-spin text-zinc-400" />
          ) : hasCheckedIn ? (
            <>
              <Check size={14} className="text-emerald-500" />
              已领取
            </>
          ) : (
            <>
              <Sparkles size={14} className="animate-pulse text-indigo-300" />
              领取 {displayReward} 积分
            </>
          )}
        </button>
      </div>
    </div>
  );
}