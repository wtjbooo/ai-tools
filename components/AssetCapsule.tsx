"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";

export default function AssetCapsule() {
  const { isAuthenticated, isReady } = useAuth();
  const [assets, setAssets] = useState({ bonusCredits: 0, freeUsesToday: 0, isPro: false });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 如果未登录，不需要请求资产接口
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const fetchAssets = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setAssets({
              bonusCredits: data.user.bonusCredits || 0,
              freeUsesToday: data.user.freeUsesToday || 0,
              isPro: data.user.isPro || false
            });
          }
        }
      } catch (error) {
        console.error("获取资产状态失败", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
  }, [isAuthenticated]);

  // 如果状态还在加载，显示一个极其克制的骨架屏
  if (!isReady || isLoading) {
    return <div className="h-9 w-24 rounded-full bg-zinc-100 animate-pulse hidden sm:block"></div>;
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* 1. 资产胶囊 (仅登录且有数据时显示) */}
      {isAuthenticated && (
        <div className="group relative flex items-center px-3 py-1.5 rounded-full border border-black/5 bg-white/60 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer hidden sm:flex">
          
          {/* 优先显示免费次数，用完显示积分 */}
          {assets.freeUsesToday > 0 && !assets.isPro ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700">
              <span className="text-cyan-500 animate-pulse">⚡️</span>
              <span>{assets.freeUsesToday} 次</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700">
              <span className="text-amber-500">🪙</span>
              <span>{assets.bonusCredits} 积分</span>
            </div>
          )}

          {/* Hover 时的毛玻璃提示 */}
          <div className="absolute top-full right-0 mt-2 w-32 p-2 rounded-xl border border-zinc-100 bg-white/90 backdrop-blur-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 text-center">
            <p className="text-[11px] text-zinc-500">
              {assets.isPro ? "🚀 Pro 无限算力" : (assets.freeUsesToday > 0 ? "今日免费额度" : "当前算力积分")}
            </p>
          </div>
        </div>
      )}

      {/* 2. 🚀 AI 助手核心入口按钮 (Apple的轮廓 + 赛博朋克的内核) */}
      <Link href="/chat">
        <button className="relative overflow-hidden px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-zinc-900 text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 hover:bg-zinc-800 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:border-cyan-500/50 border border-transparent group flex items-center gap-1.5">
          <span className="relative z-10 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-cyan-400 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI 助手
          </span>
          {/* 扫光动画涂层 */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
        </button>
      </Link>
    </div>
  );
}